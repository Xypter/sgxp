import { EmbedBuilder } from 'discord.js';
import { getArchiveLeaderboard, getArchiveStats } from './payload.js';

function nameOf(u) {
  return u.displayName || u.username || `User #${u.id}`;
}

function listOf(rows) {
  if (rows.length === 0) return '_No one yet._';
  return rows.map((u, i) => `**${i + 1}.** ${nameOf(u)} — ${u.count}`).join('\n');
}

function pct(count, total) {
  return total > 0 ? ((count / total) * 100).toFixed(2) : '0.00';
}

export async function buildArchiveLeaderboardEmbed() {
  const [stats, preparers, reviewers] = await Promise.all([
    getArchiveStats(),
    getArchiveLeaderboard('prepared', 5),
    getArchiveLeaderboard('reviewed', 5),
  ]);

  return new EmbedBuilder()
    .setTitle('🗂️ Archive Triage Leaderboard')
    .addFields(
      { name: 'Total Comics', value: stats.total.toLocaleString(), inline: true },
      { name: 'Sorted', value: `${stats.sorted.toLocaleString()} (${pct(stats.sorted, stats.total)}%)`, inline: true },
      { name: 'Kept', value: `${stats.kept.toLocaleString()} (${pct(stats.kept, stats.total)}%)`, inline: true },
      { name: 'Excluded', value: `${stats.excluded.toLocaleString()} (${pct(stats.excluded, stats.total)}%)`, inline: true },
      { name: 'Top Preparers', value: listOf(preparers), inline: true },
      { name: 'Top Reviewers', value: listOf(reviewers), inline: true }
    )
    .setColor(0x5865f2)
    .setTimestamp();
}
