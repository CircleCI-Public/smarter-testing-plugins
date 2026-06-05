import pytest

pytest_plugins = ["pytester", "pytest_circleci_coverage"]


## Fixture to set the classname attribute in the junit xml report,
## so that it matches the test atoms discovered and run in the
## test-suites.yml file.
@pytest.fixture(autouse=True)
def _circleci_classname(request, record_xml_attribute):
    record_xml_attribute("classname", request.node.nodeid)
