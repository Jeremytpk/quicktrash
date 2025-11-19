import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Button, Linking } from 'react-native';

const WebViewScreen = ({ route }) => {
  // Destructure 'url' from route.params, providing a fallback empty object
  const { url } = route.params || {};

  const [WebViewComponent, setWebViewComponent] = useState(null);
  const [loadingWebView, setLoadingWebView] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Dynamically import react-native-webview so the app can still run if the
    // native module is missing. If it isn't installed the import will fail
    // and we fall back to offering to open the URL in the external browser.
    (async () => {
      try {
        const mod = await import('react-native-webview');
        if (mounted && mod && mod.WebView) {
          setWebViewComponent(() => mod.WebView);
        }
      } catch (err) {
        // ignore - we'll render a fallback UI below
  console.log('react-native-webview not available:', error.message || error);
      } finally {
        if (mounted) setLoadingWebView(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!url) {
    return (
      <View style={styles.center}>
        <Text>No URL provided</Text>
      </View>
    );
  }

  // If the dynamic import succeeded, render the native WebView.
  if (WebViewComponent) {
    const WV = WebViewComponent;
    return (
      <View style={styles.container}>
        <WV
          source={{ uri: url }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#34A853" />
            </View>
          )}
        />
      </View>
    );
  }

  // Fallback UI while loading the dynamic import or if the module is missing
  return (
    <View style={styles.center}>
      {loadingWebView ? (
        <>
          <ActivityIndicator size="large" color="#34A853" />
          <Text style={{ marginTop: 12 }}>Loading web view...</Text>
        </>
      ) : (
        <>
          <Text style={{ textAlign: 'center', marginBottom: 12 }}>
            In-app web view is not available. You can open the onboarding page in your device browser.
          </Text>
          <Button title="Open in browser" onPress={() => Linking.openURL(url)} />
          <Text style={{ marginTop: 12, fontSize: 12, color: '#6B7280' }}>
            Tip: install the native module with "npx expo install react-native-webview" and restart the bundler to enable in-app WebView.
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
});

export default WebViewScreen;