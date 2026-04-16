const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const networkSecurityConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">13.63.86.170</domain>
  </domain-config>
</network-security-config>`;

module.exports = function withNetworkSecurityConfig(config) {
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml"
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "network_security_config.xml"),
        networkSecurityConfig
      );
      return config;
    },
  ]);

  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0].$;
    mainApplication["android:networkSecurityConfig"] =
      "@xml/network_security_config";
    return config;
  });

  return config;
};
