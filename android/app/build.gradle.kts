import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

val localProperties = Properties().apply {
    val localFile = rootProject.file("local.properties")
    if (localFile.exists()) {
        localFile.inputStream().use { load(it) }
    }
}

fun localOrDefault(key: String, default: String): String =
    (localProperties.getProperty(key) ?: default).replace("\"", "\\\"")

val supabaseUrl = localOrDefault(
    "ORIENT_SUPABASE_URL",
    "https://ksmhgaamyheyhefbyglb.supabase.co",
)
val supabasePublishableKey = localOrDefault("ORIENT_SUPABASE_PUBLISHABLE_KEY", "")

android {
    namespace = "com.teamlab.orient"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.teamlab.orient"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0-pulse-bridge"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "SUPABASE_URL", "\"$supabaseUrl\"")
        buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", "\"$supabasePublishableKey\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    val firebaseBom = platform("com.google.firebase:firebase-bom:34.18.0")
    implementation(firebaseBom)
    implementation("com.google.firebase:firebase-messaging")

    implementation(platform("io.github.jan-tennert.supabase:bom:3.8.0"))
    implementation("io.github.jan-tennert.supabase:auth-kt")
    implementation("io.github.jan-tennert.supabase:postgrest-kt")
    implementation("io.ktor:ktor-client-android:3.0.3")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")

    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.2")
    implementation("androidx.work:work-runtime-ktx:2.10.3")
    implementation("androidx.datastore:datastore-preferences:1.1.7")
    implementation("androidx.security:security-crypto:1.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("com.russhwolf:multiplatform-settings:1.3.0")
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("com.google.android.gms:play-services-wearable:20.0.1")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    testImplementation("com.google.truth:truth:1.4.4")
}

// google-services.json is local-only on this public repository.
// Apply the plugin only when the human-placed file exists so unit tests can run
// without fabricating Firebase client config.
val googleServicesFile = file("google-services.json")
if (googleServicesFile.exists()) {
    apply(plugin = "com.google.gms.google-services")
} else {
    logger.lifecycle(
        "ORIENT: android/app/google-services.json missing — " +
            "Firebase plugin skipped; place the downloaded file before device builds.",
    )
}
