"""Scheduled task entry points for the custom app."""

from __future__ import annotations

import frappe
from frappe.utils.background_jobs import is_job_enqueued


def _is_job_running(job_id: str) -> bool:
	try:
		return is_job_enqueued(job_id)
	except Exception:
		return False


def sync_frappe_pins_to_github():
	"""Daily: mirror Frappe gunicorn/pypika pins from the local bench and push.

	Disabled unless `sync_frappe_pins_to_github` is set in site_config /
	common_site_config.json. The bench git remote must already be able to push.
	"""
	if not frappe.conf.get("sync_frappe_pins_to_github"):
		return

	job_id = "custom_sync_frappe_pins"
	if _is_job_running(job_id):
		frappe.logger("custom").info(
			"sync_frappe_pins_to_github: pin sync already running; skipping."
		)
		return

	try:
		frappe.enqueue(
			"custom.tasks._run_frappe_pin_sync",
			queue="short",
			timeout=300,
			job_id=job_id,
			deduplicate=True,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Custom Scheduled: sync_frappe_pins_to_github failed")


def _run_frappe_pin_sync():
	"""Worker: rewrite pin files from sibling Frappe, commit, and push."""
	import subprocess
	import sys
	from pathlib import Path

	app_root = Path(__file__).resolve().parents[1]
	script = app_root / "scripts" / "check_frappe_pins.py"
	result = subprocess.run(
		[sys.executable, str(script), "--fix", "--commit", "--push"],
		cwd=app_root,
		text=True,
		capture_output=True,
		check=False,
	)
	output = (result.stdout or "") + (result.stderr or "")
	if result.returncode != 0:
		frappe.log_error(output or "pin sync failed", "Custom: Frappe pin sync failed")
		return
	if output.strip():
		frappe.logger("custom").info(f"sync_frappe_pins_to_github: {output.strip()}")
