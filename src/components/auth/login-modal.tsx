"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Smartphone, Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
type LoginStep = "input" | "verifying" | "success" | "error";
type LoginTab = "code" | "password";

export default function LoginModal() {
    const router = useRouter();

    const {
        refreshAuth
    } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<LoginTab>("code");
    const [step, setStep] = useState<LoginStep>("input");
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [account, setAccount] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    const clearCountdown = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, []);

    const onClose = useCallback(() => {
        clearCountdown();
        setIsOpen(false);
        setStep("input");
        setActiveTab("code");
        setPhone("");
        setCode("");
        setAccount("");
        setPassword("");
        setShowPassword(false);
        setErrorMsg("");
        setCountdown(0);
        setAgreed(false);
    }, [clearCountdown]);

    const handleSendCode = useCallback(async () => {
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            setErrorMsg("请输入正确的手机号");
            return;
        }

        setIsSending(true);
        setErrorMsg("");

        try {
            const response = await fetch("/api/sms/send", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    phone
                })
            });

            const result = await response.json();

            if (result.success) {
                setCountdown(60);

                countdownRef.current = setInterval(() => {
                    setCountdown(prev => {
                        if (prev <= 1) {
                            clearCountdown();
                            return 0;
                        }

                        return prev - 1;
                    });
                }, 1000);
            } else {
                setErrorMsg(result.error || "发送失败，请重试");
            }
        } catch (error) {
            console.error("发送验证码错误:", error);
            setErrorMsg("网络错误，请重试");
        } finally {
            setIsSending(false);
        }
    }, [phone, clearCountdown]);

    const handleCodeLogin = useCallback(async () => {
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            setErrorMsg("请输入正确的手机号");
            return;
        }

        if (!/^\d{6}$/.test(code)) {
            setErrorMsg("请输入6位验证码");
            return;
        }

        setStep("verifying");
        setErrorMsg("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    loginType: "code",
                    phone,
                    code
                })
            });

            const result = await response.json();

            if (result.success) {
                setStep("success");
                localStorage.setItem("user_info", JSON.stringify(result.data.user));

                if (result.data.token) {
                    localStorage.setItem("token", result.data.token);
                }

                window.dispatchEvent(new CustomEvent("user-logged-in", {
                    detail: result.data.user
                }));

                const userType = result.data.user?.userType;
                const redirectPath = userType === "lawyer" ? "/lawyer" : userType === "guardian" ? "/guardian/center" : null;

                setTimeout(() => {
                    onClose();

                    if (redirectPath) {
                        router.push(redirectPath);
                    } else {
                        router.refresh();
                    }
                }, 1500);
            } else {
                setStep("error");
                setErrorMsg(result.error || "登录失败，请重试");
            }
        } catch (error) {
            console.error("登录错误:", error);
            setStep("error");
            setErrorMsg("网络错误，请重试");
        }
    }, [phone, code, onClose, router]);

    const handlePasswordLogin = useCallback(async () => {
        if (!account) {
            setErrorMsg("请输入用户名或手机号");
            return;
        }

        if (!password) {
            setErrorMsg("请输入密码");
            return;
        }

        setStep("verifying");
        setErrorMsg("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    loginType: "password",
                    account,
                    password
                })
            });

            const result = await response.json();

            if (result.success) {
                setStep("success");
                localStorage.setItem("user_info", JSON.stringify(result.data.user));

                if (result.data.token) {
                    localStorage.setItem("token", result.data.token);
                }

                window.dispatchEvent(new CustomEvent("user-logged-in", {
                    detail: result.data.user
                }));

                const userType = result.data.user?.userType;
                const redirectPath = userType === "lawyer" ? "/lawyer" : userType === "guardian" ? "/guardian/center" : null;

                setTimeout(() => {
                    onClose();

                    if (redirectPath) {
                        router.push(redirectPath);
                    } else {
                        router.refresh();
                    }
                }, 1500);
            } else {
                setStep("error");
                setErrorMsg(result.error || "登录失败，请重试");
            }
        } catch (error) {
            console.error("登录错误:", error);
            setStep("error");
            setErrorMsg("网络错误，请重试");
        }
    }, [account, password, onClose, router]);

    const handleLogin = useCallback(() => {
        if (!agreed) {
            setErrorMsg("请先同意《用户协议》和《隐私政策》");
            return;
        }
        if (activeTab === "code") {
            handleCodeLogin();
        } else {
            handlePasswordLogin();
        }
    }, [activeTab, handleCodeLogin, handlePasswordLogin, agreed]);

    useEffect(() => {
        const handleOpenLogin = () => {
            setIsOpen(true);
        };

        window.addEventListener("open-login-modal", handleOpenLogin);

        return () => {
            window.removeEventListener("open-login-modal", handleOpenLogin);
        };
    }, []);

    useEffect(() => {
        return () => {
            clearCountdown();
        };
    }, [clearCountdown]);

    if (!isOpen)
        return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose} />
            {}
            <div
                className="relative bg-white rounded-xl shadow-[0_10px_40px_rgba(61,50,45,0.12)] w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {}
                <div
                    className="relative bg-[#C47353] px-6 py-6">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    {}
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-white/20">
                            <img 
                                src="/logo.png" 
                                alt="帮帮问法" 
                                className="w-10 h-10 object-contain"
                            />
                        </div>
                        <div>
                            <h2 className="text-xl font-serif text-white font-normal">帮帮问法</h2>
                            <p className="text-white/80 text-xs">专业法律服务，守护您的权益</p>
                        </div>
                    </div>
                </div>
                {}
                <div className="flex border-b">
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "code" ? "text-[#C47353] border-b-2 border-[#C47353]" : "text-[#8C7B6E] hover:text-[#3D322D]"}`}
                        onClick={() => {
                            setActiveTab("code");
                            setErrorMsg("");
                            setStep("input");
                        }}>
                        <Smartphone className="w-4 h-4 inline-block mr-1" />验证码登录
                                  </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "password" ? "text-[#C47353] border-b-2 border-[#C47353]" : "text-[#8C7B6E] hover:text-[#3D322D]"}`}
                        onClick={() => {
                            setActiveTab("password");
                            setErrorMsg("");
                            setStep("input");
                        }}>
                        <Lock className="w-4 h-4 inline-block mr-1" />密码登录
                                  </button>
                </div>
                {}
                <div className="p-6">
                    {(step === "input" || step === "error") && <div className="space-y-4">
                        {}
                        {activeTab === "code" && <>
                            {}
                            <div className="space-y-2">
                                <Label htmlFor="phone">手机号</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="请输入手机号"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                    maxLength={11}
                                    className="h-12" />
                            </div>
                            {}
                            <div className="space-y-2">
                                <Label htmlFor="code">验证码</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="code"
                                        type="text"
                                        placeholder="请输入验证码"
                                        value={code}
                                        onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        maxLength={6}
                                        className="h-12 flex-1" />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 px-4 whitespace-nowrap"
                                        onClick={handleSendCode}
                                        disabled={countdown > 0 || isSending || phone.length !== 11}>
                                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : "获取验证码"}
                                    </Button>
                                </div>
                            </div>
                        </>}
                        {}
                        {activeTab === "password" && <>
                            {}
                            <div className="space-y-2">
                                <Label htmlFor="account">用户名/手机号</Label>
                                <div className="relative">
                                    <User
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="account"
                                        type="text"
                                        placeholder="请输入用户名或手机号"
                                        value={account}
                                        onChange={e => setAccount(e.target.value)}
                                        className="h-12 pl-10" />
                                </div>
                            </div>
                            {}
                            <div className="space-y-2">
                                <Label htmlFor="password">密码</Label>
                                <div className="relative">
                                    <Lock
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="请输入密码"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="h-12 pl-10 pr-10" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            {}
                            <Link
                                href="/reset-password"
                                onClick={onClose}
                                className="text-xs text-[#C47353] hover:underline">忘记密码？
                                                  </Link>
                        </>}
                        {}
                        {errorMsg && <div className="flex items-center gap-2 text-red-500 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>{errorMsg}</span>
                        </div>}
                        {}
                        <Button
                            className="w-full h-12 bg-[#C47353] hover:bg-[#A85D40] text-white font-medium rounded-full transition-all duration-250 shadow-[0_2px_8px_rgba(196,115,83,0.3)] hover:-translate-y-[1px] active:scale-[0.98]"
                            onClick={handleLogin}
                            disabled={activeTab === "code" 
                                ? phone.length !== 11 || code.length !== 6 || !agreed 
                                : !account || !password || !agreed}>
                            {activeTab === "code" ? "登录 / 注册" : "登录"}
                        </Button>
                        {}
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <input
                                type="checkbox"
                                id="agreement"
                                checked={agreed}
                                onChange={e => setAgreed(e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-[#C47353] cursor-pointer flex-shrink-0"
                            />
                            <label htmlFor="agreement" className="cursor-pointer leading-relaxed">
                                我已阅读并同意
                                <Link href="/user-agreement" onClick={onClose} className="text-[#C47353] hover:underline">《用户协议》</Link>
                                和
                                <Link href="/privacy-policy" onClick={onClose} className="text-[#C47353] hover:underline">《隐私政策》</Link>
                                等协议内容
                            </label>
                        </div>
                        {}
                        <p
                            className="text-xs text-center"
                            style={{
                                padding: "16px",
                                backgroundColor: "transparent",
                                borderRadius: "49px",
                                borderWidth: "5px",
                                boxShadow: "rgba(0, 0, 0, 0.15) 0px 0px 30px 0px"
                            }}>
                            <span className="text-muted-foreground">还没有账号？</span>
                            <a
                                href="/register"
                                onClick={onClose}
                                className="text-[#C47353] hover:underline ml-1">立即注册
                                                </a>
                        </p>
                    </div>}
                    {step === "verifying" && <div className="flex flex-col items-center py-12">
                        <Loader2 className="w-12 h-12 text-[#C47353] animate-spin mb-4" />
                        <p className="text-muted-foreground">正在验证...</p>
                    </div>}
                    {step === "success" && <div
                        className="flex flex-col items-center py-12 animate-in fade-in zoom-in-95 duration-300">
                        <div
                            className="w-16 h-16 bg-[#FAF7F2] rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-[#C47353]" />
                        </div>
                        <p className="text-[#C47353] font-medium text-lg mb-2">登录成功</p>
                        <p className="text-muted-foreground">正在跳转...</p>
                    </div>}
                </div>
            </div>
        </div>
    );
}