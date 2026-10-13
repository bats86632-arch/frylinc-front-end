package com.fyrlinc.app;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.os.Bundle;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        // Customize the splash screen exit animation:
        // When the app is ready, smoothly expand the logo outwards while fading out,
        // seamlessly revealing the app (matching premier Android apps).
        splashScreen.setOnExitAnimationListener(splashScreenView -> {
            View iconView = splashScreenView.getIconView();
            if (iconView != null) {
                ObjectAnimator scaleX = ObjectAnimator.ofFloat(iconView, View.SCALE_X, 1.0f, 1.35f);
                ObjectAnimator scaleY = ObjectAnimator.ofFloat(iconView, View.SCALE_Y, 1.0f, 1.35f);
                ObjectAnimator alpha = ObjectAnimator.ofFloat(splashScreenView.getView(), View.ALPHA, 1.0f, 0.0f);

                AnimatorSet animatorSet = new AnimatorSet();
                animatorSet.playTogether(scaleX, scaleY, alpha);
                animatorSet.setDuration(450);
                animatorSet.setInterpolator(new AccelerateDecelerateInterpolator());
                animatorSet.addListener(new android.animation.AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(android.animation.Animator animation) {
                        splashScreenView.remove();
                    }
                });
                animatorSet.start();
            } else {
                ObjectAnimator alpha = ObjectAnimator.ofFloat(splashScreenView.getView(), View.ALPHA, 1.0f, 0.0f);
                alpha.setDuration(350);
                alpha.addListener(new android.animation.AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(android.animation.Animator animation) {
                        splashScreenView.remove();
                    }
                });
                alpha.start();
            }
        });
    }
}
