import type { LessonItem } from "./lesson-config";

export async function lessonImage(file: Blob): Promise<string> {
  if (
    file.size > 12 * 1024 * 1024 ||
    !/^image\/(png|jpeg|webp|gif)$/.test(file.type)
  )
    throw new Error("PNG/JPG/WebP/GIF 이미지(12MB 이하)를 선택해 주세요.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / image.width, 1200 / image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지를 처리할 수 없습니다.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL("image/jpeg", 0.82);
    if (result.length > 750000) result = canvas.toDataURL("image/jpeg", 0.55);
    if (result.length > 750000)
      throw new Error("이미지가 복잡합니다. 크기를 줄여 다시 넣어 주세요.");
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
// Render each slide as one bitmap, preserving slide order and visual layout.
export async function importPowerPoint(
  file: File,
  remaining = 40,
  progress?: (done: number, total: number) => void,
): Promise<LessonItem[]> {
  if (!file.name.toLowerCase().endsWith(".pptx"))
    throw new Error("PowerPoint에서 .pptx 형식으로 저장한 파일을 넣어 주세요.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("PPTX는 20MB 이하로 넣어 주세요.");
  const [
    { parseZip, buildPresentation, renderSlide, RECOMMENDED_ZIP_LIMITS },
    { toCanvas },
  ] = await Promise.all([
    import("@aiden0z/pptx-renderer"),
    import("html-to-image"),
  ]);
  const files = await parseZip(await file.arrayBuffer(), {
    ...RECOMMENDED_ZIP_LIMITS,
    maxTotalUncompressedBytes: 80 * 1024 * 1024,
    maxMediaBytes: 60 * 1024 * 1024,
  });
  const presentation = buildPresentation(files);
  if (!presentation.slides.length || presentation.slides.length > remaining)
    throw new Error(`슬라이드는 1~${remaining}장까지 가져올 수 있습니다.`);
  if (
    presentation.width > 6000 ||
    presentation.height > 6000 ||
    presentation.width <= 0 ||
    presentation.height <= 0
  )
    throw new Error("슬라이드 크기를 확인해 주세요.");
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-20000px;top:0;pointer-events:none;background:white;color:black;";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const output: LessonItem[] = [];
  try {
    for (let index = 0; index < presentation.slides.length; index++) {
      let failed = false;
      const handle = renderSlide(presentation, presentation.slides[index], {
        onNodeError: () => {
          failed = true;
        },
        pdfjs: false,
      });
      shadow.appendChild(handle.element);
      try {
        await handle.ready;
        await document.fonts.ready;
        await Promise.all(
          Array.from(handle.element.querySelectorAll("img")).map((img) =>
            img.decode(),
          ),
        );
        if (failed)
          throw new Error(
            `${index + 1}번 슬라이드의 일부 요소를 변환하지 못했습니다. PowerPoint에서 이미지로 내보낸 후 가져와 주세요.`,
          );
        const canvas = await toCanvas(handle.element, {
          backgroundColor: "#fff",
          width: presentation.width,
          height: presentation.height,
          pixelRatio: Math.min(
            2,
            1600 / presentation.width,
            1200 / presentation.height,
          ),
        });
        let image = canvas.toDataURL("image/jpeg", 0.9);
        if (image.length > 750000) image = canvas.toDataURL("image/jpeg", 0.7);
        if (image.length > 750000)
          throw new Error(
            `${index + 1}번 슬라이드 이미지가 너무 큽니다. 그림 크기를 줄여 주세요.`,
          );
        output.push({
          id: crypto.randomUUID(),
          kind: "image",
          title: `슬라이드 ${index + 1}`,
          text: "",
          image,
          enabled: true,
        });
        progress?.(index + 1, presentation.slides.length);
      } finally {
        handle.dispose();
        handle.element.remove();
      }
    }
    return output;
  } finally {
    host.remove();
  }
}
