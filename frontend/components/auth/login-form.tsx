"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";



const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean(),
});



type LoginFormValues = z.infer<typeof loginSchema>;



export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
const router = useRouter();
const saveLogin = useAuthStore((state) => state.login);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const remember = watch("remember");

  const mutation = useMutation({
    mutationFn: login,

    onSuccess: (response) => {
      const token = response.data?.token;
      const user = response.data?.user;

      if (token && user) {
        saveLogin(token, user);
        localStorage.setItem("token", token);
        toast.success("Login Successful");
        router.push("/dashboard");
      } else {
        toast.error("Invalid login response format");
      }
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = (values) => {
  mutation.mutate({
    email: values.email,
    password: values.password,
  });
};

  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-bold">Welcome Back</h2>
        <p className="mt-2 text-slate-500">
          Sign in to continue
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* Email */}

        <div>
          <Label>Email Address</Label>

          <div className="relative mt-2">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <Input
              placeholder="admin@multichannel.com"
              className="pl-12 h-12"
              {...register("email")}
            />
          </div>

          {errors.email && (
            <p className="mt-1 text-sm text-red-500">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}

        <div>
          <Label>Password</Label>

          <div className="relative mt-2">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              className="h-12 pl-12 pr-12"
              {...register("password")}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-slate-500" />
              ) : (
                <Eye className="h-5 w-5 text-slate-500" />
              )}
            </button>
          </div>

          {errors.password && (
            <p className="mt-1 text-sm text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember */}

        <div className="flex items-center gap-3">
          <Checkbox
            checked={remember}
            onCheckedChange={(checked) =>
              setValue("remember", checked === true)
            }
          />

          <Label className="cursor-pointer">
            Remember Me
          </Label>
        </div>

        {/* Button */}

        <Button
          type="submit"
          className="h-12 w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-5 w-5" />
              Login
            </>
          )}
        </Button>
      </form>

      <div className="mt-8 rounded-xl bg-slate-50 p-4">
        <p className="font-semibold">Demo Credentials</p>

        <p className="mt-2 text-sm">
          Email: admin@multichannel.com
        </p>

        <p className="text-sm">
          Password: Admin@123
        </p>
      </div>
    </div>
  );
}