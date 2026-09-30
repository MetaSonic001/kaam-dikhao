import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <div className="wrap grid min-h-[70vh] place-items-center py-12"><SignIn /></div>;
}
