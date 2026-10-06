export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeStorage } = await import("./lib/config");
    await initializeStorage();
  }
}
