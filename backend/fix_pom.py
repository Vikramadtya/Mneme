import xml.etree.ElementTree as ET

tree = ET.parse('pom.xml')
root = tree.getroot()
ns = {'m': 'http://maven.apache.org/POM/4.0.0'}
ET.register_namespace('', 'http://maven.apache.org/POM/4.0.0')

# This is getting complicated, let me just rewrite the entire pom.xml file cleanly.
