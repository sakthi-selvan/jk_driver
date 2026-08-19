export default {
  expo: {
    name: "JK Taxi Driver",
    slug: "driver",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "jktaxidriver",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/jk_taxi_driver_logo.png",
      resizeMode: "contain",
      backgroundColor: "#FFFFFF",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.jktaxi.driver",
      buildNumber: "1",
      infoPlist: {
        CFBundleDisplayName: "JK Taxi Driver",
        NSLocationWhenInUseUsageDescription:
          "JK Taxi Driver needs your location to show your position to riders and navigate to pickups.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "JK Taxi Driver needs your location in the background to keep riders updated on your position during trips.",
        UIBackgroundModes: ["location", "fetch", "remote-notification"],
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#FFFFFF",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.jktaxi.driver",
      versionCode: 1,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "VIBRATE",
        "WAKE_LOCK",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
      name: "JK Taxi Driver",
      shortName: "JK Driver",
      themeColor: "#FFFFFF",
      backgroundColor: "#FFFFFF",
    },
    plugins: [
      "expo-router",
      [
        "expo-audio",
        {
          // Playback only — no microphone for ride-offer alarm
          recordAudioAndroid: false,
          microphonePermission: false,
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/jk_taxi_driver_logo.png",
          // Android 12+ circular mask — padding baked into splash-icon.png
          imageWidth: 260,
          resizeMode: "contain",
          backgroundColor: "#FFFFFF",
          dark: {
            image: "./assets/images/jk_taxi_driver_logo.png",
            imageWidth: 260,
            resizeMode: "contain",
            backgroundColor: "#FFFFFF",
          },
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow JK Taxi Driver to access your location to show your position to riders and navigate to pickups.",
          isAndroidBackgroundLocationEnabled: true,
          isIosBackgroundLocationEnabled: true,
        },
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
          RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN,
        },
      ],
      "expo-font",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "6dbf8cb0-9eca-428f-b158-9139cb86f545",
      },
    },
    owner: "ssakthitselvan",
  },
};
