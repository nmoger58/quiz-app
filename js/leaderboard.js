/**
 * Leaderboard & Visualizations Module
 * Renders mid-game overlay, section-end results, and grand finale podium.
 */

class LeaderboardRenderer {
  /**
   * Renders the top 3 podium HTML
   */
  static renderPodiumHtml(rankedTeams, isFinal = false) {
    if (!rankedTeams || rankedTeams.length === 0) return '';
    const first = rankedTeams[0] || null;
    const second = rankedTeams[1] || null;
    const third = rankedTeams[2] || null;

    return `
      <div class="podium-container d-flex justify-content-center align-items-end my-4">
        <!-- 2nd Place (Silver) -->
        ${second ? `
          <div class="podium-step podium-silver text-center mx-2 animate__animated animate__fadeInUp">
            <div class="podium-medal">🥈</div>
            <div class="podium-team-name font-kannada fw-bold">${second.name}</div>
            <div class="podium-score badge bg-secondary fs-5">${second.score} ಅಂಕ</div>
            <div class="podium-block silver-block d-flex align-items-center justify-content-center">
              <span class="fs-1 fw-bold text-white">2</span>
            </div>
          </div>
        ` : ''}

        <!-- 1st Place (Gold) -->
        ${first ? `
          <div class="podium-step podium-gold text-center mx-2 animate__animated animate__bounceIn">
            <div class="podium-crown">👑</div>
            <div class="podium-medal">🥇</div>
            <div class="podium-team-name font-kannada fw-bold text-warning fs-5">${first.name}</div>
            <div class="podium-score badge bg-warning text-dark fs-4">${first.score} ಅಂಕ</div>
            <div class="podium-block gold-block d-flex align-items-center justify-content-center">
              <span class="fs-1 fw-bold text-dark">1</span>
            </div>
          </div>
        ` : ''}

        <!-- 3rd Place (Bronze) -->
        ${third ? `
          <div class="podium-step podium-bronze text-center mx-2 animate__animated animate__fadeInUp">
            <div class="podium-medal">🥉</div>
            <div class="podium-team-name font-kannada fw-bold">${third.name}</div>
            <div class="podium-score badge bg-danger fs-5">${third.score} ಅಂಕ</div>
            <div class="podium-block bronze-block d-flex align-items-center justify-content-center">
              <span class="fs-1 fw-bold text-white">3</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Renders the full leaderboard table HTML
   */
  static renderTableHtml(rankedTeams, currentCategoryId = null) {
    if (!rankedTeams || rankedTeams.length === 0) {
      return '<div class="text-center text-muted p-4">ಯಾವುದೇ ತಂಡಗಳ ವಿವರ ಲಭ್ಯವಿಲ್ಲ</div>';
    }

    let rows = rankedTeams.map((team, idx) => {
      let rankBadge = `<span class="badge bg-dark border border-secondary">${idx + 1}</span>`;
      if (idx === 0) rankBadge = `<span class="badge bg-warning text-dark fw-bold">🥇 1st</span>`;
      else if (idx === 1) rankBadge = `<span class="badge bg-secondary text-white fw-bold">🥈 2nd</span>`;
      else if (idx === 2) rankBadge = `<span class="badge bg-danger text-white fw-bold">🥉 3rd</span>`;

      const sectionScore = (currentCategoryId && team.categoryScores) 
        ? (team.categoryScores[currentCategoryId] || 0) 
        : null;

      return `
        <tr class="${idx === 0 ? 'table-warning bg-opacity-10' : ''}">
          <td class="text-center align-middle">${rankBadge}</td>
          <td class="font-kannada fw-bold align-middle fs-6 text-light">${team.name}</td>
          ${sectionScore !== null ? `<td class="text-center align-middle text-info fw-bold">+${sectionScore}</td>` : ''}
          <td class="text-center align-middle text-warning fw-bold fs-5">${team.score}</td>
          <td class="text-center align-middle text-success fw-bold">${team.correctCount || 0}</td>
          <td class="text-center align-middle text-danger">${team.wrongCount || 0}</td>
          <td class="text-center align-middle text-muted">${team.timeoutCount || 0}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="table-responsive">
        <table class="table table-dark table-hover table-striped align-middle mb-0">
          <thead>
            <tr class="table-secondary text-dark text-center font-kannada">
              <th style="width: 80px;">ಸ್ಥಾನ (Rank)</th>
              <th class="text-start">ತಂಡದ ಹೆಸರು (Team Name)</th>
              ${currentCategoryId ? `<th>ವಿಭಾಗದ ಅಂಕ (Section)</th>` : ''}
              <th>ಒಟ್ಟು ಅಂಕಗಳು (Total)</th>
              <th>ಸರಿ (Correct)</th>
              <th>ತಪ್ಪು (Wrong)</th>
              <th>ಟೈಮ್‌ಔಟ್ (Timeout)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Triggers celebration confetti
   */
  static triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 60,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 60,
          origin: { x: 1 }
        });
      }, 400);
    }
  }

  /**
   * Renders Chart.js team comparison bar chart
   */
  static renderChart(canvasElement, teams) {
    if (!canvasElement || typeof Chart === 'undefined') return;

    const ranked = ScoringSystem.getRankedTeams(teams);
    const labels = ranked.map(t => t.name);
    const scores = ranked.map(t => t.score);
    const correctAnswers = ranked.map(t => t.correctCount || 0);

    // Destroy previous chart if exists
    if (canvasElement.chartInstance) {
      canvasElement.chartInstance.destroy();
    }

    const ctx = canvasElement.getContext('2d');
    canvasElement.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'ಒಟ್ಟು ಅಂಕಗಳು (Points)',
            data: scores,
            backgroundColor: 'rgba(245, 158, 11, 0.85)',
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderRadius: 6
          },
          {
            label: 'ಸರಿಯಾದ ಉತ್ತರಗಳು (Correct)',
            data: correctAnswers,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10b981',
            borderWidth: 2,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#f8fafc',
              font: { family: "'Noto Sans Kannada', sans-serif", size: 13 }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#e2e8f0',
              font: { family: "'Noto Sans Kannada', sans-serif" }
            },
            grid: { color: 'rgba(255, 255, 255, 0.08)' }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#e2e8f0' },
            grid: { color: 'rgba(255, 255, 255, 0.08)' }
          }
        }
      }
    });
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { LeaderboardRenderer };
}
