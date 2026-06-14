FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9.0.0

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod false
COPY . .

# 构建时需要的公共环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DEPLOY_ENV=PROD

# Supabase (构建时需要 NEXT_PUBLIC_ 前缀的变量)
ENV NEXT_PUBLIC_SUPABASE_URL=https://hznzreihgnosbmdfyeod.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bnpyZWloZ25vc2JtZGZ5ZW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzI0ODcsImV4cCI6MjA5MTc0ODQ4N30.QcQPh8IbNDumLDWwgGIYrwg-5N3xm0KLAM2-jgK0GZ8

# 站点 URL (构建时需要)
ENV NEXT_PUBLIC_SITE_URL=https://bangbangwenfa.com

RUN pnpm next build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DEPLOY_ENV=PROD

# ============================================
# Supabase
# ============================================
ENV NEXT_PUBLIC_SUPABASE_URL=https://hznzreihgnosbmdfyeod.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bnpyZWloZ25vc2JtZGZ5ZW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzI0ODcsImV4cCI6MjA5MTc0ODQ4N30.QcQPh8IbNDumLDWwgGIYrwg-5N3xm0KLAM2-jgK0GZ8
ENV SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bnpyZWloZ25vc2JtZGZ5ZW9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE3MjQ4NywiZXhwIjoyMDkxNzQ4NDg3fQ.pvkWj_JBqZ6UFhSOdTuaBezpPGvbYZDbE_wlm29XkM4

# ============================================
# JWT
# ============================================
ENV JWT_SECRET=b594bcf1ef2dfa67afbf0dc9b0b7fa4e6ed74ce6c8b6cc9e7618f68efce06ac11196313335f0d1e7498711c7f1891d66e420328cef23cde86573715c9a0f80e3

# ============================================
# 微信支付
# ============================================
ENV WEIXIN_APPID=wx343ec9d7a1cf3f9f
ENV WEIXIN_MCHID=1730950042
ENV WEIXIN_SERIAL_NO=42EB9A8F3D4E38A16370EC9F93B958E45B1D94D9
ENV WEIXIN_APIV3_KEY=8vib3M08k1c3KamWhBbF20it7S4s41JA
ENV WEIXIN_CALLBACK_URL=https://bangbangwenfa.com/api/pay/callback

# ============================================
# 腾讯云短信
# ============================================
ENV TENCENT_SECRET_ID=AKID6B4mPp33wc3HKF4i9NPEpDPOAlAMRIvN
ENV TENCENT_SECRET_KEY=IQN9j5hDVZP5aryta4LXecNwHYbQ4Xs2
ENV TENCENT_SMS_APP_ID=1401053130
ENV TENCENT_SMS_SIGN_NAME=加法蔚众湛江科技
ENV TENCENT_SMS_TEMPLATE_ID=2645574
ENV TENCENT_SMS_ORDER_TEMPLATE_ID=2645574

# ============================================
# 站点 URL
# ============================================
ENV NEXT_PUBLIC_SITE_URL=https://bangbangwenfa.com

# ============================================
# 订单通知 Webhook
# ============================================
ENV ORDER_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=b7e5d5e6-5528-4431-9116-13d330e20e55

# ============================================
# 微信支付私钥 - 写入文件
# ============================================
RUN echo "-----BEGIN PRIVATE KEY-----" > /app/weixin_private_key.pem
RUN echo "MIIEwAIBADANBgkqhkiG9w0BAQEFAASCBKowggSmAgEAAoIBAQDMR88/oAFK4vOE" >> /app/weixin_private_key.pem
RUN echo "QCrtbl6zybpLlbUw5N06uqcWRnqd0EUqFI3ABsPc86XxbYu0flh61P84dk/kfIoD" >> /app/weixin_private_key.pem
RUN echo "6OevzDYlf4kvU3yVo+6BDaDRh80ggH1i0Fc2YgxNbO96xuluQX34GytGoPCR+CBg" >> /app/weixin_private_key.pem
RUN echo "+6us8ZuQ0+/BUcFgrJGG2jPq/UX+VeedMbaCQGzd+Uyo+fCUlu6NoXS5ab1K2KN8" >> /app/weixin_private_key.pem
RUN echo "4ak3iYj3ZtQ+pHjq/CkkU/WO7Lnl15An/786mi7BjtWpMKRz2Eti+94IPWiSP1nd" >> /app/weixin_private_key.pem
RUN echo "P3h2BWlxHIgPDURlSlk0gy1vkU8s2KVVEMe1CIk1lIsmxtvqefVptc1vGXyOPZEP" >> /app/weixin_private_key.pem
RUN echo "ogJRlTCvAgMBAAECggEBAK1edGGHJhGsMweWfdgrx2vGVLk5QSFR2v+w0YVyIzY0" >> /app/weixin_private_key.pem
RUN echo "P77K2tKR60Bl9/vCAMMaR3VXt5LvtjYwC+HtlFP6eCmy53am4CEPk6crLcUl/80J" >> /app/weixin_private_key.pem
RUN echo "v2BRePLKm65KOaR1lD7ijko2pK+4fvMjJjeo37ZTBrgPZncnL3sgehF8tntEoFaM" >> /app/weixin_private_key.pem
RUN echo "gwVCK+vg17Tlg7Wwrdr1Tf+zOutR9hHVLpRZU4TmZ5TWDBkoZM0EhrPyiFscgW1V" >> /app/weixin_private_key.pem
RUN echo "NQnvwRZ1Jb4Ty08YZWjF3T2uM2jgSxF7coqcQBoyl0MmRyMcZb7HLo/PcVXHgZUP" >> /app/weixin_private_key.pem
RUN echo "sKZPvW48CB8w2P4JvGYrrt9Xm746+fyr2Nz6wrkW9uECgYEA/6dEA40QlfMD3cOP" >> /app/weixin_private_key.pem
RUN echo "Js4DFl6Acz9hWIzHAz2MF9JaolsWN6IhXOR0DOB3KYMOcBV6f1rntIvj+c7SKLSJ" >> /app/weixin_private_key.pem
RUN echo "0zPTJoVv1rdtw4zv29lQbEgv9+pf/GaJP7CjxtSlgd9lCe5w6hEUXFePUkrxupsJ" >> /app/weixin_private_key.pem
RUN echo "nO3FQGk98kUTVzC0tbMUSQlGCAsCgYEAzI62hFUjvuJIHNM+edHnZ+4F8s9hZxAq" >> /app/weixin_private_key.pem
RUN echo "VMZulq/wokFgkcohpyXz2czsjh+xTwQC/WZ4JlfunboLJ1+G2qvDNMrvt5oRhKWL" >> /app/weixin_private_key.pem
RUN echo "kOnjZkmx8ObL0NuD7CGZwHYBMotdJ1efNpuQS3y6YJoRCc7ezCRX98NoNhX7D87h" >> /app/weixin_private_key.pem
RUN echo "Z68EQLrxzG0CgYEAi5ICxLmHu4Vvr+tqxLGl59lx4PlSKOi6YZ+BUyQJTSfTSk4e" >> /app/weixin_private_key.pem
RUN echo "Trt+S+VjyOr+v9xKAyta4iuZK7Fo9MYTlJVvilFBDIUZzK+t52WNzX/fiEaRXpeQ" >> /app/weixin_private_key.pem
RUN echo "CJBj6VIAhZWzcKeXR4JJjlxTJ4c4zzqDFgSNMqwCILjrZSd3ENeSlIkWjZ8CgYEA" >> /app/weixin_private_key.pem
RUN echo "sBBF2DDPy4RIPUc1BvU8D6A3Tn5gf6zSQpVoqhpVK9LJo7IutQddk6FmGg39Nt1l" >> /app/weixin_private_key.pem
RUN echo "FWYVFCurHeb7oq/+Cki8g7wICCd73IgAUIJ/T5MurQJ5exL1wVBKXfUzoqWBUFOC" >> /app/weixin_private_key.pem
RUN echo "niXXVKHOaUcyUxbTfTHq5T4zfBn/NeQC7pMdPfmqFSECgYEA6zl5WrsTD0ij4t2f" >> /app/weixin_private_key.pem
RUN echo "bz4c1hpIU5riPDwXz5jAhCKtzV0BMkUowd8U4o+APBNERqksyU02pERYvZ86z7SE" >> /app/weixin_private_key.pem
RUN echo "9R85GAIgMJuzLZtn1gC1Gz/hGhiaoKagLbziCJdmj3xV0Va6g9PICz7d3Vwj+My4" >> /app/weixin_private_key.pem
RUN echo "bByW/X20gmz0/3lLFm0VUFkD+a0=" >> /app/weixin_private_key.pem
RUN echo "-----END PRIVATE KEY-----" >> /app/weixin_private_key.pem

# 微信支付私钥 - 通过环境变量指向文件
ENV WEIXIN_PRIVATE_KEY_FILE=/app/weixin_private_key.pem

# ============================================
# 微信平台证书 - 写入文件
# ============================================
RUN echo "-----BEGIN CERTIFICATE-----" > /app/weixin_platform_cert.pem
RUN echo "MIIELjCCAxagAwIBAgIUQuuajz1OOKFjcOyfk7lY5FsdlNkwDQYJKoZIhvcNAQEL" >> /app/weixin_platform_cert.pem
RUN echo "BQAwXjELMAkGA1UEBhMCQ04xEzARBgNVBAoTClRlbnBheS5jb20xHTAbBgNVBAsT" >> /app/weixin_platform_cert.pem
RUN echo "FFRlbnBheS5jb20gQ0EgQ2VudGVyMRswGQYDVQQDExJUZW5wYXkuY29tIFJvb3Qg" >> /app/weixin_platform_cert.pem
RUN echo "Q0EwHhcNMjUxMTAxMTIwNTU0WhcNMzAxMDMxMTIwNTU0WjCBhzETMBEGA1UEAwwK" >> /app/weixin_platform_cert.pem
RUN echo "MTczMDk1MDA0MjEbMBkGA1UECgwS5b6u5L+h5ZWG5oi357O757ufMTMwMQYDVQQL" >> /app/weixin_platform_cert.pem
RUN echo "DCrliqDms5XolJrkvJfvvIjmuZvmsZ/vvInnp5HmioDmnInpmZDlhazlj7gxCzAJ" >> /app/weixin_platform_cert.pem
RUN echo "BgNVBAYTAkNOMREwDwYDVQQHDAhTaGVuWmhlbjCCASIwDQYJKoZIhvcNAQEBBQAD" >> /app/weixin_platform_cert.pem
RUN echo "ggEPADCCAQoCggEBAMxHzz+gAUri84RAKu1uXrPJukuVtTDk3Tq6pxZGep3QRSoU" >> /app/weixin_platform_cert.pem
RUN echo "jcAGw9zzpfFti7R+WHrU/zh2T+R8igPo56/MNiV/iS9TfJWj7oENoNGHzSCAfWLQ" >> /app/weixin_platform_cert.pem
RUN echo "VzZiDE1s73rG6W5BffgbK0ag8JH4IGD7q6zxm5DT78FRwWCskYbaM+r9Rf5V550x" >> /app/weixin_platform_cert.pem
RUN echo "toJAbN35TKj58JSW7o2hdLlpvUrYo3zhqTeJiPdm1D6keOr8KSRT9Y7sueXXkCf/" >> /app/weixin_platform_cert.pem
RUN echo "vzqaLsGO1akwpHPYS2L73gg9aJI/Wd0/eHYFaXEciA8NRGVKWTSDLW+RTyzYpVUQ" >> /app/weixin_platform_cert.pem
RUN echo "x7UIiTWUiybG2+p59Wm1zW8ZfI49kQ+iAlGVMK8CAwEAAaOBuTCBtjAJBgNVHRME" >> /app/weixin_platform_cert.pem
RUN echo "AjAAMAsGA1UdDwQEAwID+DCBmwYDVR0fBIGTMIGQMIGNoIGKoIGHoIGDoIGAoG+G" >> /app/weixin_platform_cert.pem
RUN echo "L2VjY2EuaXRydXMuY29tLmNuL3B1YmxpYy9pdHJ1c2NybD9DQT0xQkQ0MjIwRTUw" >> /app/weixin_platform_cert.pem
RUN echo "REJDMDRCMDZBRDM5NzU0OTg0NkMwMUMzRThFQkQyJnNnPUhBQ0M0NzFCNjU0MjJF" >> /app/weixin_platform_cert.pem
RUN echo "MTJCMjdBOUQzM0E4N0FEMUNERjU5MjZFMTQwMzcxMA0GCSqGSIb3DQEBCwUAA4IB" >> /app/weixin_platform_cert.pem
RUN echo "AQA40fkEkYx+BwPJ2d5WAya6ZY4xUSUT8uXqM30x+GHZG7CMQpCM3kO95lQYXcFf" >> /app/weixin_platform_cert.pem
RUN echo "95EIISfJGejGnQNqEba4SscElsg8XKsyEgvQui5O0AFUhELIapEbwLLXvt3HslpX" >> /app/weixin_platform_cert.pem
RUN echo "Dr2FMzNkvmQIfkEYvZxK2DC3NCXXAH7Gq7JwnxwXZQEbRhKA+nYPwbr6WqNXz/Cn+52MeWmx5kN+uQCHsfKEQA9ZfTRWiJGioKzi5c8f7DjUFPGEXrMJ/JqEcMJRe4fY" >> /app/weixin_platform_cert.pem
RUN echo "lkkUAAqdohr2zPC3CwyR2i1x6PPzv6yQsv0bNCwFe33NLQjc5TE4akrFTpqXGTfV" >> /app/weixin_platform_cert.pem
RUN echo "Q2vhmy4UMOrHcj1sI/xiRYMw==" >> /app/weixin_platform_cert.pem
RUN echo "-----END CERTIFICATE-----" >> /app/weixin_platform_cert.pem

# 微信平台证书 - 通过环境变量指向文件
ENV WEIXIN_PLATFORM_CERT_FILE=/app/weixin_platform_cert.pem

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]