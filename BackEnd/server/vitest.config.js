"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
        reporters: [
            "default",
            ["html", { outputFile: node_path_1.default.resolve(__dirname, "test-results/vitest-server.html") }],
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            reportsDirectory: "coverage",
            include: ["src/utils/examStartDeadline.ts"],
        },
    },
    resolve: {
        alias: {
            "~": node_path_1.default.resolve(__dirname, "src"),
        },
    },
});
//# sourceMappingURL=vitest.config.js.map