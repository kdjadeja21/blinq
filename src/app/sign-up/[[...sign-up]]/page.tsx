import { LegalFooterLinks } from "@/components/legal/LegalPage";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 py-6">
      <SignUp />
      <LegalFooterLinks />
    </div>
  );
}
