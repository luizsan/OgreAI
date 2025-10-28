import fs from "fs";
import chalk from "chalk";

const OUTPUT_DIR = "../output";

await Bun.build({
    entrypoints: ["index.ts"],
    outdir: OUTPUT_DIR,
    target: "bun"
});

try{
    console.log("Checking output directory...");
    if(!fs.existsSync(OUTPUT_DIR)){
        fs.mkdirSync(OUTPUT_DIR);
        console.log("Created output directory");
    }

    if(fs.existsSync("./img")){
        console.log(`Copying ${chalk.blue("/img")}`);
        fs.cpSync("./img", `${OUTPUT_DIR}/img`, { recursive: true });
    }

    if(fs.existsSync("./whitelist.txt")){
        console.log(`Copying ${chalk.blue("whitelist.txt")}`);
        fs.copyFileSync("./whitelist.txt", `${OUTPUT_DIR}/whitelist.txt`);
    }
}catch(error){
    console.error(chalk.red(`❌ Build post-processing failed:\n${error}`));
}