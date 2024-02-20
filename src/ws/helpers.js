export const convertLeaderboardToScore = lb => {
	return {
		username: lb.username,
		didWin: !!lb.success,
		score: lb.wins,
		order: lb.naturalorder
	}
};