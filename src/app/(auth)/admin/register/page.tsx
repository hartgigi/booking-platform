"use client";

import { useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signUp, signOut } from "@/lib/firebase/auth";
import FloatingInput from "@/components/ui/FloatingInput";
import { cn } from "@/lib/utils/cn";
import {
  LayoutGrid,
  Bell,
  BarChart3,
} from "lucide-react";

const BUSINESS_OPTIONS: { value: string; label: string }[] = [
  { value: "barbershop", label: "ร้านตัดผม / Barbershop" },
  { value: "beauty_salon", label: "ร้านเสริมสวย / Beauty Salon" },
  { value: "spa", label: "สปา / Spa" },
  { value: "thai_massage", label: "นวดแผนไทย / Thai Massage" },
  { value: "aesthetic_clinic", label: "คลินิกความงาม / Aesthetic Clinic" },
  { value: "general_clinic", label: "คลินิกทั่วไป / General Clinic" },
  { value: "dental_clinic", label: "ทันตกรรม / Dental Clinic" },
  { value: "nail_salon", label: "ร้านทำเล็บ / Nail Salon" },
  { value: "fitness", label: "ฟิตเนส / Fitness" },
  { value: "pilates", label: "โยคะ / Pilates" },
  { value: "other", label: "อื่นๆ / Other" },
];

const schema = z
  .object({
    shopName: z.string().min(2, "ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร"),
    email: z.string().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
    businessType: z.string().min(1, "กรุณาเลือกประเภทธุรกิจ"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function AdminRegisterPage() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      shopName: "",
      email: "",
      password: "",
      confirmPassword: "",
      businessType: "",
    },
  });

  async function onStep1Next() {
    const valid = await trigger(["shopName", "businessType"]);
    if (valid) setStep(2);
  }

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const userCredential = await signUp(data.email, data.password);
      const idToken = await userCredential.user.getIdToken();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          shopName: data.shopName.trim(),
          businessType: data.businessType,
        }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "สมัครสมาชิกไม่สำเร็จ");
        return;
      }
      await signOut();
      window.location.href = "/admin/login?registered=true";
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      const message =
        code === "auth/email-already-in-use"
          ? "อีเมลนี้ถูกใช้งานแล้ว"
          : err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message)
            : "เกิดข้อผิดพลาด";
      setError(message);
    }
  }

  return (
    <div className="min-h-screen flex animate-fade-in">
      <div className="hidden lg:flex lg:w-[60%] flex-col justify-between bg-linear-to-br from-teal-600 to-cyan-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-size-[24px_24px]" />
        <div className="relative z-10 p-12 flex flex-col items-center justify-center flex-1">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            JongMe
          </h1>
          <p className="text-white/90 text-lg mb-16">
            ระบบจัดการการจองอัจฉริยะ
          </p>
          <ul className="space-y-6 text-white/95">
            <li className="flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span>จัดการง่าย</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2">
                <Bell className="w-5 h-5" />
              </div>
              <span>แจ้งเตือนอัตโนมัติ</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span>รายงานครบถ้วน</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="w-full lg:w-[40%] flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[360px] animate-scale-in">
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">
            JongMe
          </h2>
          <p className="text-slate-500 text-sm mb-6">สมัครสมาชิก</p>
          <div className="flex gap-2 mb-8">
            <div
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                step >= 1 ? "bg-teal-600" : "bg-slate-200"
              )}
            />
            <div
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                step >= 2 ? "bg-teal-600" : "bg-slate-200"
              )}
            />
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3"
              >
                {error}
              </div>
            )}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <Controller
                  name="shopName"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <FloatingInput
                        label="ชื่อร้าน"
                        type="text"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      {errors.shopName && (
                        <p className="text-red-500 text-xs mt-1">{errors.shopName.message}</p>
                      )}
                    </div>
                  )}
                />
                <div>
                  <label className="block text-sm text-slate-500 mb-1.5">ประเภทธุรกิจ</label>
                  <select
                    className={cn(
                      "w-full rounded-lg border bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500",
                      errors.businessType ? "border-red-300" : "border-slate-200"
                    )}
                    {...register("businessType")}
                  >
                    <option value="">เลือกประเภทธุรกิจ</option>
                    {BUSINESS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.businessType && (
                    <p className="text-red-500 text-xs mt-1">{errors.businessType.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onStep1Next}
                  className="w-full rounded-lg bg-teal-600 py-3 px-4 font-medium text-white hover:bg-teal-700 transition-colors"
                >
                  ถัดไป
                </button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  ← ย้อนกลับ
                </button>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <FloatingInput
                        label="อีเมล"
                        type="email"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                      )}
                    </div>
                  )}
                />
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <FloatingInput
                        label="รหัสผ่าน"
                        type="password"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      {errors.password && (
                        <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                      )}
                    </div>
                  )}
                />
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <FloatingInput
                        label="ยืนยันรหัสผ่าน"
                        type="password"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                  )}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-teal-600 py-3 px-4 font-medium text-white hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
                </button>
              </div>
            )}
          </form>
          <p className="text-center text-slate-500 text-sm mt-6">
            มีบัญชีอยู่แล้ว?{" "}
            <Link
              href="/admin/login"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
