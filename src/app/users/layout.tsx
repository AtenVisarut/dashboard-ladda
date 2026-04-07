import Sidebar from "@/components/layout/Sidebar";

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64">{children}</main>
    </div>
  );
}
