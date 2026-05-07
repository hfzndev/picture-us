// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-frost-white">
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {children}
      </div>
    </div>
  );
}