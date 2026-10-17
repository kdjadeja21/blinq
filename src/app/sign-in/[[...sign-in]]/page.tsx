import { LegalFooterLinks } from "@/components/legal/LegalPage";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 py-6">
      <SignIn />
      <LegalFooterLinks />
    </div>
  );
}
