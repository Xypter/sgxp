import { boot } from "https://656703bb61f20c00084a3479--edge.netlify.com/bootstrap/index-combined.ts";

const functions = {}; const metadata = { functions: {} };


      try {
        const { default: func } = await import("file:///C:/Users/Michael/OneDrive/Desktop/sgxp/visible-venus/.netlify/edge-functions/hello.js");

        if (typeof func === "function") {
          functions["hello"] = func;
          metadata.functions["hello"] = {"url":"file:///C:/Users/Michael/OneDrive/Desktop/sgxp/visible-venus/.netlify/edge-functions/hello.js"}
        } else {
          console.log("\u001b[91m◈\u001b[39m \u001b[31mFailed\u001b[39m to load Edge Function \u001b[33mhello\u001b[39m. The file does not seem to have a function as the default export.");
        }
      } catch (error) {
        console.log("\u001b[91m◈\u001b[39m \u001b[31mFailed\u001b[39m to run Edge Function \u001b[33mhello\u001b[39m:");
        console.error(error);
      }
      

boot(functions, metadata);