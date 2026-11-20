import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/index.ts");
Config.setVideoImageFormat("jpeg");
// Default quality 80 rings around sharp text and thin lines on the charcoal background.
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(18);
