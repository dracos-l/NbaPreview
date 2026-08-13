import { fixtureStatus } from "@/lib/sportradar/fixtures";
import { getBostonPreviewFromFixtures } from "@/lib/sportradar/normalize";

export const dynamic = "force-dynamic";

export default async function Home() {
  const fixtures = await fixtureStatus();
  const preview = fixtures.every(({ exists }) => exists) ? await getBostonPreviewFromFixtures() : null;
  return (
    <main style={{ fontFamily: "system-ui", margin: "3rem auto", maxWidth: 760 }}>
      <h1>NBA Team Preview — data harness</h1>
      <p>Boston-only, fixture-first Sportradar response capture. No browser request is made to Sportradar.</p>
      <p><code>SPORTRADAR_USE_FIXTURES</code> is {process.env.SPORTRADAR_USE_FIXTURES === "false" ? "off" : "on"}.</p>
      <ul>{fixtures.map(({ name, exists }) => <li key={name}>{name}: {exists ? "captured" : "not yet captured"}</li>)}</ul>
      {preview && <>
        <h2>{preview.team.market} {preview.team.name}</h2>
        <p>{preview.roster.length} current-roster players · {preview.coaches.map((coach) => `${coach.name} (${coach.role})`).join(", ")}</p>
        <p>{preview.relevantTransactions.length} captured transactions involving Boston.</p>
      </>}
      <p>Run <code>npm run sportradar:capture -- --live</code> only after adding the key to <code>.env.local</code>.</p>
    </main>
  );
}
