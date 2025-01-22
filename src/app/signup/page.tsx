"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SignupPage() {
  const { register, handleSubmit, formState: { errors: formErrors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const errors: any = formErrors;

  const onSubmit = async (data: any) => {
    const { email, password } = data;
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const { data: user, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (user) {
        setSuccessMessage("Signup successful! Please check your email for confirmation.");
        alert("Signup successful! Please check your email for confirmation.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center bg-transparent">
        <Link href="/" className="text-white text-xl font-semibold hover:underline">
          Cubid Starter
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center flex-grow p-6">
        <Card className="w-full max-w-md p-6 bg-white/10 backdrop-blur-lg rounded-3xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold text-center text-white">
              Create an Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-white/10 text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-white"
                  {...register("email", { required: "Email is required" })}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  className="bg-white/10 text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-white"
                  {...register("password", { required: "Password is required" })}
                />
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <p className="text-red-600 text-center mt-2">{error}</p>
              )}

              {successMessage && (
                <p className="text-green-500 text-center mt-2">{successMessage}</p>
              )}

              <Button
                variant="default"
                type="submit"
                className="mt-4 py-3 w-full bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-all duration-300"
                disabled={loading}
              >
                {loading ? "Signing up..." : "Sign Up"}
              </Button>
            </form>
            <div className="flex items-center justify-center mt-6">
              <Link href="/login" className="text-sm font-semibold text-white hover:underline">
                Already have an account? Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}