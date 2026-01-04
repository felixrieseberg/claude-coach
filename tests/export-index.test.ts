import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sanitizeFilename,
  getAvailableFormats,
  downloadFile,
} from "../src/viewer/lib/export/index.js";
import type { Sport } from "../src/schema/training-plan.js";

describe("sanitizeFilename", () => {
  it("should remove invalid characters", () => {
    expect(sanitizeFilename("file<>name")).toBe("filename");
    expect(sanitizeFilename('file:"name')).toBe("filename");
    expect(sanitizeFilename("file/\\name")).toBe("filename");
    expect(sanitizeFilename("file|?*name")).toBe("filename");
  });

  it("should remove all invalid characters in combination", () => {
    expect(sanitizeFilename('<>:"/\\|?*')).toBe("");
    expect(sanitizeFilename("test<>file:name")).toBe("testfilename");
  });

  it("should replace spaces with underscores", () => {
    expect(sanitizeFilename("my workout file")).toBe("my_workout_file");
    expect(sanitizeFilename("  multiple   spaces  ")).toBe("_multiple_spaces_");
  });

  it("should handle multiple consecutive spaces", () => {
    expect(sanitizeFilename("a    b")).toBe("a_b");
    expect(sanitizeFilename("word1  word2   word3")).toBe("word1_word2_word3");
  });

  it("should limit length to 100 characters", () => {
    const longName = "a".repeat(150);
    expect(sanitizeFilename(longName)).toHaveLength(100);
    expect(sanitizeFilename(longName)).toBe("a".repeat(100));
  });

  it("should handle names at exactly 100 characters", () => {
    const exactName = "b".repeat(100);
    expect(sanitizeFilename(exactName)).toHaveLength(100);
    expect(sanitizeFilename(exactName)).toBe(exactName);
  });

  it("should handle short names without truncation", () => {
    expect(sanitizeFilename("short")).toBe("short");
    expect(sanitizeFilename("Workout_1")).toBe("Workout_1");
  });

  it("should handle empty string", () => {
    expect(sanitizeFilename("")).toBe("");
  });

  it("should handle combined transformations", () => {
    const result = sanitizeFilename("My <Cool> Workout: Day 1?");
    expect(result).toBe("My_Cool_Workout_Day_1");
  });
});

describe("getAvailableFormats", () => {
  it("should return zwo, fit, and mrc for bike workouts", () => {
    const formats = getAvailableFormats("bike");
    expect(formats).toContain("zwo");
    expect(formats).toContain("fit");
    expect(formats).toContain("mrc");
    expect(formats).toHaveLength(3);
  });

  it("should return zwo and fit for run workouts", () => {
    const formats = getAvailableFormats("run");
    expect(formats).toContain("zwo");
    expect(formats).toContain("fit");
    expect(formats).not.toContain("mrc");
    expect(formats).toHaveLength(2);
  });

  it("should return only fit for swim workouts", () => {
    const formats = getAvailableFormats("swim");
    expect(formats).toContain("fit");
    expect(formats).not.toContain("zwo");
    expect(formats).not.toContain("mrc");
    expect(formats).toHaveLength(1);
  });

  it("should return only fit for strength workouts", () => {
    const formats = getAvailableFormats("strength");
    expect(formats).toContain("fit");
    expect(formats).not.toContain("zwo");
    expect(formats).not.toContain("mrc");
    expect(formats).toHaveLength(1);
  });

  it("should return only fit for brick workouts", () => {
    const formats = getAvailableFormats("brick");
    expect(formats).toContain("fit");
    expect(formats).not.toContain("zwo");
    expect(formats).not.toContain("mrc");
    expect(formats).toHaveLength(1);
  });

  it("should return empty array for rest days", () => {
    const formats = getAvailableFormats("rest");
    expect(formats).toHaveLength(0);
  });

  it("should return empty array for race", () => {
    const formats = getAvailableFormats("race");
    expect(formats).toHaveLength(0);
  });
});

describe("downloadFile", () => {
  let mockCreateElement: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockLink: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockClick = vi.fn();
    mockLink = {
      href: "",
      download: "",
      click: mockClick,
    };

    mockCreateElement = vi.fn().mockReturnValue(mockLink);
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();
    mockCreateObjectURL = vi.fn().mockReturnValue("blob:test-url");
    mockRevokeObjectURL = vi.fn();

    // Mock document
    vi.stubGlobal("document", {
      createElement: mockCreateElement,
      body: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild,
      },
    });

    // Mock URL
    vi.stubGlobal("URL", {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should create a blob from string content", () => {
    downloadFile("test content", "test.txt", "text/plain");

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("text/plain");
  });

  it("should create a blob from Uint8Array content", () => {
    const content = new Uint8Array([1, 2, 3, 4, 5]);
    downloadFile(content, "test.bin", "application/octet-stream");

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("application/octet-stream");
  });

  it("should create an anchor element", () => {
    downloadFile("content", "file.txt", "text/plain");

    expect(mockCreateElement).toHaveBeenCalledWith("a");
  });

  it("should set the correct href and download attributes", () => {
    downloadFile("content", "myfile.xml", "application/xml");

    expect(mockLink.href).toBe("blob:test-url");
    expect(mockLink.download).toBe("myfile.xml");
  });

  it("should append link to body, click, and remove", () => {
    downloadFile("content", "file.txt", "text/plain");

    expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
  });

  it("should revoke the object URL after download", () => {
    downloadFile("content", "file.txt", "text/plain");

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });

  it("should handle different MIME types", () => {
    downloadFile("<xml>content</xml>", "workout.zwo", "application/xml");

    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    expect(blobArg.type).toBe("application/xml");
    expect(mockLink.download).toBe("workout.zwo");
  });

  it("should call operations in correct order", () => {
    const callOrder: string[] = [];

    mockCreateObjectURL.mockImplementation(() => {
      callOrder.push("createObjectURL");
      return "blob:test";
    });
    mockAppendChild.mockImplementation(() => callOrder.push("appendChild"));
    mockClick.mockImplementation(() => callOrder.push("click"));
    mockRemoveChild.mockImplementation(() => callOrder.push("removeChild"));
    mockRevokeObjectURL.mockImplementation(() => callOrder.push("revokeObjectURL"));

    downloadFile("test", "file.txt", "text/plain");

    expect(callOrder).toEqual([
      "createObjectURL",
      "appendChild",
      "click",
      "removeChild",
      "revokeObjectURL",
    ]);
  });
});
