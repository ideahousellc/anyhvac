"""Generate Campaign #003's revised silent 0–3 second Blender opening shot.

The script imports the approved still-scene foundation, begins outside the duct
for recognition, moves through the mouth toward the reducer, and adds restrained
qualitative 3D airflow. It can render one or more phone-first review frames or the
full 90-frame PNG sequence. No manual Blender UI work is required.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector

SCRIPT_DIRECTORY = Path(__file__).resolve().parent
if str(SCRIPT_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIRECTORY))

import duct_hero_frame as foundation


FPS = 30
FRAME_START = 0
FRAME_END = 89


def parse_args() -> argparse.Namespace:
    script_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--blend", required=True, type=Path)
    parser.add_argument("--samples", type=int, default=48)
    parser.add_argument("--scale", type=float, default=1.0)
    parser.add_argument("--frame", type=int)
    parser.add_argument("--review-frames", nargs="+", type=int)
    parser.add_argument("--motion-blur", action="store_true")
    return parser.parse_args(script_args)


def aim_quaternion(
    location: tuple[float, float, float],
    target: tuple[float, float, float],
):
    return (Vector(target) - Vector(location)).to_track_quat("-Z", "Y")


def configure_camera_animation() -> bpy.types.Object:
    bpy.ops.object.camera_add()
    camera = bpy.context.active_object
    camera.name = "Campaign 003 Opening Camera"
    camera.data.lens = 36.0
    camera.data.sensor_width = 36.0
    camera.data.clip_start = 0.08
    camera.data.clip_end = 120.0
    camera.rotation_mode = "QUATERNION"

    poses = [
        # Start outside and off-axis so the flange, exterior sheet, thickness,
        # and interior depth all read before the camera enters the duct.
        (0, (5.80, 16.80, -1.60), (0.00, -1.20, 0.10)),
        (18, (3.00, 8.30, -0.90), (0.05, -3.40, 0.20)),
        # Cross the mouth between 0.6 and 0.9 seconds.
        (27, (1.10, 3.55, -0.50), (0.15, -5.80, 0.30)),
        (45, (0.50, 0.90, -0.20), (0.30, -8.20, 0.52)),
        # Finish just upstream of the reducer so its sloped panels surround a
        # clearly continuous smaller downstream duct rather than a flat portal.
        (89, (-0.55, -0.65, -0.55), (0.55, -14.50, 0.70)),
    ]
    for frame, location, target in poses:
        camera.location = location
        camera.rotation_quaternion = aim_quaternion(location, target)
        camera.keyframe_insert(data_path="location", frame=frame)
        camera.keyframe_insert(data_path="rotation_quaternion", frame=frame)

    bpy.context.scene.camera = camera
    return camera


def make_airflow_material() -> bpy.types.Material:
    material = bpy.data.materials.new("Qualitative Airflow")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (0.52, 0.74, 0.86, 1.0)
    emission.inputs["Strength"].default_value = 0.72
    mix = nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = 0.12
    links.new(transparent.outputs["BSDF"], mix.inputs[1])
    links.new(emission.outputs["Emission"], mix.inputs[2])
    links.new(mix.outputs["Shader"], output.inputs["Surface"])
    return material


def duct_cross_section(y: float) -> tuple[float, float, float, float]:
    if y >= foundation.REDUCER_FRONT_Y:
        return 0.0, 0.0, foundation.BIG_WIDTH, foundation.BIG_HEIGHT
    if y <= foundation.REDUCER_BACK_Y:
        return (
            foundation.SMALL_X,
            foundation.SMALL_Z,
            foundation.SMALL_WIDTH,
            foundation.SMALL_HEIGHT,
        )
    progress = (foundation.REDUCER_FRONT_Y - y) / (
        foundation.REDUCER_FRONT_Y - foundation.REDUCER_BACK_Y
    )
    center_x = foundation.SMALL_X * progress
    center_z = foundation.SMALL_Z * progress
    width = foundation.BIG_WIDTH + (foundation.SMALL_WIDTH - foundation.BIG_WIDTH) * progress
    height = foundation.BIG_HEIGHT + (foundation.SMALL_HEIGHT - foundation.BIG_HEIGHT) * progress
    return center_x, center_z, width, height


def create_airflow_streaks(material: bpy.types.Material) -> None:
    for index in range(8):
        curve_data = bpy.data.curves.new(f"AirflowStreak{index:02d}Curve", type="CURVE")
        curve_data.dimensions = "3D"
        curve_data.resolution_u = 1
        curve_data.bevel_depth = 0.007 + (index % 2) * 0.001
        curve_data.bevel_resolution = 2
        curve_data.resolution_u = 1
        spline = curve_data.splines.new("POLY")
        spline.points.add(1)
        length = 1.20 + (index % 3) * 0.16
        spline.points[0].co = (0.0, -length / 2, 0.0, 1.0)
        spline.points[1].co = (0.0, length / 2, 0.0, 1.0)

        streak = bpy.data.objects.new(f"Airflow Streak {index:02d}", curve_data)
        bpy.context.collection.objects.link(streak)
        curve_data.materials.append(material)

        horizontal = 0.50 * math.sin(index * 2.399)
        vertical = 0.46 * math.sin(index * 4.123 + 1.1)
        initial_y = 3.2 - ((index % 8) * 1.55)
        velocity = 5.1 + (index % 4) * 0.32

        for frame in range(FRAME_START, FRAME_END + 1, 3):
            y = initial_y - velocity * (frame / FPS)
            center_x, center_z, width, height = duct_cross_section(y)
            streak.location = (
                center_x + horizontal * width * 0.43,
                y,
                center_z + vertical * height * 0.40,
            )
            reducer_progress = max(
                0.0,
                min(
                    1.0,
                    (foundation.REDUCER_FRONT_Y - y)
                    / (foundation.REDUCER_FRONT_Y - foundation.REDUCER_BACK_Y),
                ),
            )
            streak.scale = (1.0, 1.0 + 0.45 * reducer_progress, 1.0)
            streak.keyframe_insert(data_path="location", frame=frame)
            streak.keyframe_insert(data_path="scale", frame=frame)

        if FRAME_END % 3:
            frame = FRAME_END
            y = initial_y - velocity * (frame / FPS)
            center_x, center_z, width, height = duct_cross_section(y)
            streak.location = (
                center_x + horizontal * width * 0.43,
                y,
                center_z + vertical * height * 0.40,
            )
            streak.keyframe_insert(data_path="location", frame=frame)
            streak.keyframe_insert(data_path="scale", frame=frame)


def configure_animation_render(args: argparse.Namespace) -> str:
    scene = bpy.context.scene
    scene.frame_start = FRAME_START
    scene.frame_end = FRAME_END
    scene.render.fps = FPS
    scene.render.fps_base = 1.0

    render_args = argparse.Namespace(
        output=args.output_dir / "frames" / "opening_",
        blend=args.blend,
        assets=args.assets,
        engine="cycles",
        samples=args.samples,
        scale=args.scale,
    )
    device = foundation.configure_render(render_args)
    frames_dir = args.output_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str((frames_dir / "opening_").resolve())
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"

    if hasattr(scene.render, "use_motion_blur"):
        scene.render.use_motion_blur = args.motion_blur
    if hasattr(scene.render, "motion_blur_shutter"):
        scene.render.motion_blur_shutter = 0.22
    return device


def main() -> None:
    args = parse_args()
    args.assets = args.assets.resolve()
    args.output_dir = args.output_dir.resolve()
    args.blend = args.blend.resolve()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.blend.parent.mkdir(parents=True, exist_ok=True)

    foundation.clear_scene()
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    galvanized = foundation.make_galvanized_material(args.assets)
    hardware = foundation.make_hardware_material()
    foundation.build_geometry(galvanized, hardware)
    # A bright terminal face made the reducer read as a portal. Let the smaller
    # duct continue into darkness instead, preserving physical continuity.
    end_cap = bpy.data.objects.get("End Cap")
    if end_cap is not None:
        bpy.data.objects.remove(end_cap, do_unlink=True)
    foundation.configure_world(args.assets / "studio_small_08_1k.hdr")
    foundation.add_area_light("Soft Key", (-5.0, 6.5, 7.5), (0.0, -4.0, 0.8), 950.0, 5.5, (0.88, 0.95, 1.0))
    foundation.add_area_light("Cool Edge", (6.5, 1.5, 3.0), (0.8, -6.0, 0.2), 700.0, 4.0, (0.48, 0.70, 0.9))
    foundation.add_area_light("Interior Fill", (-2.5, -1.5, -2.2), (0.4, -12.0, 0.4), 500.0, 3.0, (0.78, 0.87, 0.92))
    configure_camera_animation()
    create_airflow_streaks(make_airflow_material())
    device = configure_animation_render(args)

    bpy.ops.wm.save_as_mainfile(filepath=str(args.blend))
    render_started = time.perf_counter()
    review_frames = args.review_frames or ([args.frame] if args.frame is not None else None)
    if review_frames is None:
        bpy.ops.render.render(animation=True)
        render_kind = "ANIMATION"
    else:
        quality_dir = args.output_dir / "quality-tests"
        quality_dir.mkdir(parents=True, exist_ok=True)
        for frame in review_frames:
            if not FRAME_START <= frame <= FRAME_END:
                raise ValueError(f"Frame must be between {FRAME_START} and {FRAME_END}")
            bpy.context.scene.frame_set(frame)
            bpy.context.scene.render.filepath = str(
                quality_dir
                / f"frame-{frame:04d}-samples-{args.samples}-blur-{str(args.motion_blur).lower()}.png"
            )
            bpy.ops.render.render(write_still=True)
        render_kind = "REVIEW_FRAMES"
    render_seconds = time.perf_counter() - render_started

    scene = bpy.context.scene
    print(f"BLENDER_VERSION={bpy.app.version_string}")
    print(f"BACKGROUND_MODE={bpy.app.background}")
    print(f"RENDER_KIND={render_kind}")
    print(f"RENDER_ENGINE={scene.render.engine}")
    print(f"RENDER_DEVICE={device}")
    print(f"RESOLUTION={scene.render.resolution_x}x{scene.render.resolution_y}")
    print(f"SAMPLES={args.samples}")
    print(f"MOTION_BLUR={args.motion_blur}")
    print(f"RENDER_SECONDS={render_seconds:.3f}")
    print(f"OUTPUT_DIR={args.output_dir}")
    print(f"BLEND_FILE={args.blend}")


if __name__ == "__main__":
    main()
