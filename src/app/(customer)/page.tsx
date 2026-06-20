export default async function HomePage() {
  const HomePageClient = (await import("@/components/home/HomePageClient")).default;
  return <HomePageClient />;
}
