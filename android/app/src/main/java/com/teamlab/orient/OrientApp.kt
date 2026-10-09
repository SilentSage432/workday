package com.teamlab.orient

import android.app.Application
import androidx.work.Configuration
import com.teamlab.orient.pulse.PulseNotification

class OrientApp : Application(), Configuration.Provider {
    override fun onCreate() {
        super.onCreate()
        PulseNotification.ensureChannel(this)
    }

    override val workManagerConfiguration: Configuration
        get() =
            Configuration.Builder()
                .setMinimumLoggingLevel(android.util.Log.INFO)
                .build()
}
