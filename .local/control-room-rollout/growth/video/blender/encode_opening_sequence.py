"""Encode the rendered opening PNG sequence with Blender's bundled FFmpeg."""

from __future__ import annotations

import argparse
from pathlib import Path
import shutil
import sys
import time

import bpy


def parse_args() -> argparse.Namespace:
    script_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    return parser.parse_args(script_args)


def configure_video(scene: bpy.types.Scene, output: Path, width: int, height: int) -> None:
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.fps = 30
    scene.render.fps_base = 1.0
    scene.render.filepath = str(output)
    scene.render.image_settings.media_type = "VIDEO"
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "HIGH"
    scene.render.ffmpeg.ffmpeg_preset = "GOOD"
    scene.render.ffmpeg.audio_codec = "NONE"
    scene.render.use_file_extension = True
    scene.render.film_transparent = False


def main() -> None:
    args = parse_args()
    frames_directory = args.frames.resolve()
    output_directory = args.output_dir.resolve()
    output_directory.mkdir(parents=True, exist_ok=True)

    frames = sorted(frames_directory.glob("opening_*.png"))
    if len(frames) != 90:
        raise ValueError(f"Expected 90 frames, found {len(frames)}")
    if frames[0].name != "opening_0000.png" or frames[-1].name != "opening_0089.png":
        raise ValueError("Opening frame sequence is not contiguous from 0000 through 0089")

    scene = bpy.context.scene
    scene.frame_start = 0
    scene.frame_end = 89
    # Establish the portrait canvas before creating the image strip. Blender's
    # default landscape canvas would otherwise bake the portrait sequence into
    # a smaller letterboxed rectangle before the output size is changed.
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1920
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"

    editor = scene.sequence_editor_create()
    strip = editor.strips.new_image(
        name="Campaign 003 Blender Opening",
        filepath=str(frames[0]),
        channel=1,
        frame_start=0,
        fit_method="FIT",
    )
    for frame in frames[1:]:
        strip.elements.append(frame.name)

    outputs = [
        (output_directory / "duct-opening-blender-0-3s-1080x1920.mp4", 1080, 1920),
        (output_directory / "duct-opening-blender-0-3s-phone-360x640.mp4", 360, 640),
    ]
    started = time.perf_counter()
    for output, width, height in outputs:
        configure_video(scene, output, width, height)
        bpy.ops.render.render(animation=True)
        print(f"ENCODED={output}")

    representative_directory = output_directory / "representative-frames"
    representative_directory.mkdir(parents=True, exist_ok=True)
    representatives = [
        (0, "0.0s-frame-0000.png"),
        (15, "0.5s-frame-0015.png"),
        (45, "1.5s-frame-0045.png"),
        (89, "3.0s-frame-0089.png"),
    ]
    for frame_number, filename in representatives:
        shutil.copyfile(frames_directory / f"opening_{frame_number:04d}.png", representative_directory / filename)

    print(f"ENCODE_SECONDS={time.perf_counter() - started:.3f}")
    print(f"FRAME_COUNT={len(frames)}")
    print(f"REPRESENTATIVE_DIR={representative_directory}")


if __name__ == "__main__":
    main()
