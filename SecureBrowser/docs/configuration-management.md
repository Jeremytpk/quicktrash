diff --git a//dev/null b/SecureBrowser/docs/configuration-management.md
index 0000000000000000000000000000000000000000..da36f36388be004a83b5bd0a1edb6ada68754010 100644
--- a//dev/null
+++ b/SecureBrowser/docs/configuration-management.md
@@ -0,0 +1,9 @@
+# Configuration Management Process
+
+The browser configuration is managed through JSON policy files and Python scripts.
+
+- **Policy File:** `policy.config.json` defines all registry keys and settings.
+- **Scripts:** `Deploy-SecureBrowser.py` installs the browser and applies the base configuration. `Set-SecureBrowserPolicy.py` can be run at any time to reapply or update policies.
+- **Version Control:** Store changes in source control (such as Git) to track modifications and facilitate rollbacks.
+
+Administrators should test policy changes in a staging environment before rolling them out to all endpoints.
