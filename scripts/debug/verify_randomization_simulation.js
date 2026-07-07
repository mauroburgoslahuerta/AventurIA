
// Logic extracted from index.tsx
function testShuffling(iterations) {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };

    for (let k = 0; k < iterations; k++) {
        // Mock question setup (Correct answer is always "Correct")
        let q = {
            options: ["Correct", "Wrong1", "Wrong2", "Wrong3"],
            correctIndex: 0
        };

        // Store original correct answer string
        const correctAnswer = q.options[q.correctIndex];

        // Shuffle options (The exact logic from index.tsx)
        for (let i = q.options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
        }

        // Find new correct index
        q.correctIndex = q.options.indexOf(correctAnswer);

        // Record result
        if (counts[q.correctIndex] !== undefined) {
            counts[q.correctIndex]++;
        }
    }

    return counts;
}

const ITERATIONS = 10000;
const results = testShuffling(ITERATIONS);

console.log(`Running ${ITERATIONS} iterations...`);
console.log("Distribution of Correct Answer Index:");
console.log(`Position A (0): ${results[0]} (${(results[0] / ITERATIONS * 100).toFixed(2)}%)`);
console.log(`Position B (1): ${results[1]} (${(results[1] / ITERATIONS * 100).toFixed(2)}%)`);
console.log(`Position C (2): ${results[2]} (${(results[2] / ITERATIONS * 100).toFixed(2)}%)`);
console.log(`Position D (3): ${results[3]} (${(results[3] / ITERATIONS * 100).toFixed(2)}%)`);

// Verify variance is within acceptable bounds (e.g., +/- 2%)
const isUniform = Object.values(results).every(count => {
    const percentage = count / ITERATIONS;
    return percentage > 0.23 && percentage < 0.27;
});

if (isUniform) {
    console.log("\n✅ PASS: Randomization appears uniform.");
} else {
    console.log("\n❌ FAIL: Randomization seems skewed.");
}
