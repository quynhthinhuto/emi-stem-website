document.querySelectorAll("[data-video-preview]").forEach(preview => {
  preview.addEventListener("click", () => {
    const url = new URL(preview.dataset.videoSrc);
    url.searchParams.set("autoplay", "1");
    const player = document.createElement("iframe");
    player.src = url.href;
    player.title = preview.getAttribute("aria-label");
    player.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    player.referrerPolicy = "strict-origin-when-cross-origin";
    player.allowFullscreen = true;
    preview.replaceWith(player);
    player.focus();
  });
});
