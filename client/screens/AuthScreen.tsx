import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const {
    signIn,
    signUp,
    pendingVerification,
    pendingEmail,
    checkEmailVerification,
    cancelVerification,
    resendVerificationEmail,
  } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for email verification
  useEffect(() => {
    if (pendingVerification) {
      pollingRef.current = setInterval(async () => {
        const verified = await checkEmailVerification();
        if (verified) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }, 3000); // Check every 3 seconds

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }
  }, [pendingVerification, checkEmailVerification]);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        Alert.alert("Error", error.message);
      }
      // Don't show success alert for signup - we'll show the verification screen
    } catch {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    const { error } = await resendVerificationEmail();
    setResending(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Email Sent", "A new verification email has been sent.");
    }
  };

  const handleCancelVerification = () => {
    cancelVerification();
    setIsLogin(true);
  };

  // Show email verification pending screen
  if (pendingVerification && pendingEmail) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top + 40 }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View entering={FadeIn} style={styles.verificationContainer}>
          <View style={styles.emailIconContainer}>
            <Feather name="mail" size={48} color={Colors.light.primary} />
          </View>

          <ThemedText style={styles.verificationTitle}>
            Check your email
          </ThemedText>

          <ThemedText style={styles.verificationSubtitle}>
            We&apos;ve sent a verification link to
          </ThemedText>

          <ThemedText style={styles.verificationEmail}>
            {pendingEmail}
          </ThemedText>

          <ThemedText style={styles.verificationHint}>
            Click the link in the email to verify your account. This page will
            automatically update once you&apos;re verified.
          </ThemedText>

          <View style={styles.verificationLoader}>
            <ActivityIndicator size="small" color={Colors.light.primary} />
            <ThemedText style={styles.verificationLoaderText}>
              Waiting for verification...
            </ThemedText>
          </View>

          <Pressable
            style={[styles.resendButton, resending && styles.buttonDisabled]}
            onPress={handleResendEmail}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator size="small" color={Colors.light.primary} />
            ) : (
              <>
                <Feather
                  name="refresh-cw"
                  size={16}
                  color={Colors.light.primary}
                />
                <ThemedText style={styles.resendButtonText}>
                  Resend verification email
                </ThemedText>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={handleCancelVerification}
          >
            <ThemedText style={styles.cancelButtonText}>
              Use a different email
            </ThemedText>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 40 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <View style={styles.logoContainer}>
          <Feather name="shopping-bag" size={48} color={Colors.light.primary} />
        </View>
        <ThemedText style={styles.title}>JaTango</ThemedText>
        <ThemedText style={styles.subtitle}>Live Shopping</ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200)} style={styles.form}>
        <View style={styles.inputContainer}>
          <Feather
            name="mail"
            size={20}
            color={Colors.light.secondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.light.secondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputContainer}>
          <Feather
            name="lock"
            size={20}
            color={Colors.light.secondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.light.secondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.light.buttonText} />
          ) : (
            <ThemedText style={styles.buttonText}>
              {isLogin ? "Sign In" : "Create Account"}
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          style={styles.switchButton}
          onPress={() => setIsLogin(!isLogin)}
        >
          <ThemedText style={styles.switchText}>
            {isLogin
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </ThemedText>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300)} style={styles.footer}>
        <ThemedText style={styles.footerText}>
          By continuing, you agree to our Terms of Service
        </ThemedText>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.light.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.secondary,
  },
  form: {
    gap: Spacing.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  button: {
    backgroundColor: Colors.light.primary,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.light.buttonText,
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  switchText: {
    color: Colors.light.primary,
    fontSize: 14,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.secondary,
    textAlign: "center",
  },
  // Email verification styles
  verificationContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  emailIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  verificationTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  verificationSubtitle: {
    fontSize: 16,
    color: Colors.light.secondary,
    textAlign: "center",
  },
  verificationEmail: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.primary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  verificationHint: {
    fontSize: 14,
    color: Colors.light.secondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  verificationLoader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: `${Colors.light.primary}10`,
    borderRadius: BorderRadius.md,
  },
  verificationLoaderText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: "500",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  resendButtonText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.light.secondary,
  },
});
