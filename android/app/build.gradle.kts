plugins {
    id("com.android.application")
}

// Release signing material is injected by CI; local debug builds never need it.
val keystorePath: String? = System.getenv("CM_KEYSTORE_PATH")
val keystorePassword: String? = System.getenv("CM_KEYSTORE_PASSWORD")
val keyAliasValue: String? = System.getenv("CM_KEY_ALIAS")
val keyPasswordValue: String? = System.getenv("CM_KEY_PASSWORD")

val ciVersionName: String? = (findProperty("appVersionName") as String?)
val ciVersionCode: Int? = (findProperty("appVersionCode") as String?)?.toIntOrNull()

android {
    namespace = "com.crimsonmoon.widgets"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.crimsonmoon.widgets"
        minSdk = 23
        targetSdk = 35
        versionCode = ciVersionCode ?: 10100
        versionName = ciVersionName ?: "1.1.1"
    }

    signingConfigs {
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = keystorePassword
                keyAlias = keyAliasValue
                keyPassword = keyPasswordValue
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("release")
            if (signingConfig == null) {
                logger.warn("No CM_KEYSTORE_PATH set: assembleRelease will produce an unsigned APK.")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // Supplies org.kustom.api.Provider, the exported content provider KWGT
    // queries for a pack's presets. Without it the pack is invisible to KWGT's
    // installed-pack picker and only the app's own tap-to-open works.
    implementation("org.bitbucket.frankmonza:kustomapi:21")
}
