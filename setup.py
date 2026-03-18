from setuptools import find_packages, setup

with open("requirements.txt") as f:
    install_requires = [line.strip() for line in f if line.strip() and not line.startswith("#")]

setup(
    name="custom",
    version="0.0.1",
    description="Custom ERPNext POS extensions",
    author="Custom",
    author_email="dev@example.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    python_requires=">=3.11",
    install_requires=install_requires,
)
