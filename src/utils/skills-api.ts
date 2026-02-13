const SEARCH_API_BASE =
  process.env.SKILLS_API_URL || "https://skills.sh";

export interface SearchSkill {
  name: string;
  slug: string;
  source: string;
  installs: number;
}

export async function searchSkillsAPI(
  query: string,
): Promise<SearchSkill[]> {
  try {
    const url = `${SEARCH_API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url);

    if (!res.ok) return [];

    const data = (await res.json()) as {
      skills: Array<{
        id: string;
        name: string;
        installs: number;
        source: string;
      }>;
    };

    return data.skills.map((skill) => ({
      name: skill.name,
      slug: skill.id,
      source: skill.source || "",
      installs: skill.installs,
    }));
  } catch {
    return [];
  }
}
