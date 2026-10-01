"""Generate and render Campaign #003's Blender duct hero frame headlessly.

Usage:
  blender --background --factory-startup --python-exit-code 1 \
    --python duct_hero_frame.py -- \
    --assets <asset-directory> --output <png> --blend <blend-file>
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector


BIG_WIDTH = 7.6
BIG_HEIGHT = 10.8
SMALL_WIDTH = 4.9
SMALL_HEIGHT = 6.9
SMALL_X = 0.55
SMALL_Z = 0.7
MOUTH_Y = 4.0
REDUCER_FRONT_Y = -3.5
REDUCER_BACK_Y = -9.0
DUCT_END_Y = -20.0


def parse_args() -> argparse.Namespace:
    script_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--blend", required=True, type=Path)
    parser.add_argument("--engine", choices=("cycles", "eevee"), default="cycles")
    parser.add_argument("--samples", type=int, default=128)
    parser.add_argument("--scale", type=float, default=1.0)
    return parser.parse_args(script_args)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for data_collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(data_collection):
            if block.users == 0:
                data_collection.remove(block)


def activate(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifier(obj: bpy.types.Object, name: str) -> None:
    activate(obj)
    bpy.ops.object.modifier_apply(modifier=name)


def smart_uv(obj: bpy.types.Object) -> None:
    activate(obj)
    if obj.type != "MESH":
        return
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    try:
        bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=0.025)
    except TypeError:
        bpy.ops.uv.smart_project(angle_limit=math.radians(62))
    bpy.ops.object.mode_set(mode="OBJECT")


def finish_mesh(
    obj: bpy.types.Object,
    material: bpy.types.Material,
    bevel: float = 0.045,
    segments: int = 3,
) -> bpy.types.Object:
    if bevel > 0:
        modifier = obj.modifiers.new(name="ManufacturedEdge", type="BEVEL")
        modifier.width = bevel
        modifier.segments = segments
        modifier.limit_method = "ANGLE"
        modifier.angle_limit = math.radians(20)
        apply_modifier(obj, modifier.name)
    smart_uv(obj)
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return obj


def add_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    material: bpy.types.Material,
    bevel: float = 0.045,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_mesh(obj, material, bevel=bevel)


def create_panel(
    name: str,
    vertices: list[tuple[float, float, float]],
    material: bpy.types.Material,
    thickness: float = 0.09,
    bevel: float = 0.04,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], [tuple(range(len(vertices)))])
    mesh.validate()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")

    solidify = obj.modifiers.new(name="SheetGauge", type="SOLIDIFY")
    solidify.thickness = thickness
    solidify.offset = 0.0
    solidify.use_even_offset = True
    apply_modifier(obj, solidify.name)
    return finish_mesh(obj, material, bevel=bevel)


def create_rectangular_ring(
    name: str,
    inner_width: float,
    inner_height: float,
    rail: float,
    depth: float,
    y: float,
    center_x: float,
    center_z: float,
    material: bpy.types.Material,
    bevel: float,
) -> bpy.types.Object:
    outer_width = inner_width + rail * 2
    outer_height = inner_height + rail * 2
    y_front = y + depth / 2
    y_back = y - depth / 2

    def corners(width: float, height: float, plane_y: float) -> list[tuple[float, float, float]]:
        return [
            (center_x - width / 2, plane_y, center_z - height / 2),
            (center_x + width / 2, plane_y, center_z - height / 2),
            (center_x + width / 2, plane_y, center_z + height / 2),
            (center_x - width / 2, plane_y, center_z + height / 2),
        ]

    vertices = (
        corners(outer_width, outer_height, y_front)
        + corners(inner_width, inner_height, y_front)
        + corners(outer_width, outer_height, y_back)
        + corners(inner_width, inner_height, y_back)
    )
    faces: list[tuple[int, int, int, int]] = []
    for index in range(4):
        nxt = (index + 1) % 4
        faces.append((index, nxt, 4 + nxt, 4 + index))
        faces.append((8 + nxt, 8 + index, 12 + index, 12 + nxt))
        faces.append((index, 8 + index, 8 + nxt, nxt))
        faces.append((4 + nxt, 12 + nxt, 12 + index, 4 + index))

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    return finish_mesh(obj, material, bevel=bevel, segments=3)


def create_prism_from_profile(
    name: str,
    profile: list[tuple[float, float]],
    y_front: float,
    y_back: float,
    material: bpy.types.Material,
    bevel: float,
) -> bpy.types.Object:
    vertices = [(x, y_front, z) for x, z in profile] + [
        (x, y_back, z) for x, z in profile
    ]
    count = len(profile)
    faces: list[tuple[int, ...]] = [tuple(range(count)), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish_mesh(obj, material, bevel=bevel, segments=2)


def create_image_texture(
    nodes: bpy.types.Nodes,
    path: Path,
    name: str,
    non_color: bool,
) -> bpy.types.ShaderNodeTexImage:
    node = nodes.new("ShaderNodeTexImage")
    node.name = name
    node.label = name
    node.image = bpy.data.images.load(str(path), check_existing=True)
    node.image.colorspace_settings.name = "Non-Color" if non_color else "sRGB"
    node.extension = "REPEAT"
    node.interpolation = "Linear"
    return node


def make_galvanized_material(assets: Path) -> bpy.types.Material:
    material = bpy.data.materials.new("Galvanized HVAC Sheet")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    principled = nodes.new("ShaderNodeBsdfPrincipled")
    principled.inputs["Base Color"].default_value = (0.43, 0.48, 0.51, 1.0)
    principled.inputs["Metallic"].default_value = 0.86
    principled.inputs["Roughness"].default_value = 0.48

    texcoord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (2.25, 2.25, 2.25)
    links.new(texcoord.outputs["UV"], mapping.inputs["Vector"])

    prefix = assets / "Metal049A_1K-JPG"
    color = create_image_texture(nodes, prefix / "Metal049A_1K-JPG_Color.jpg", "CC0 Base Color", False)
    roughness = create_image_texture(nodes, prefix / "Metal049A_1K-JPG_Roughness.jpg", "CC0 Roughness", True)
    metalness = create_image_texture(nodes, prefix / "Metal049A_1K-JPG_Metalness.jpg", "CC0 Metalness", True)
    normal = create_image_texture(nodes, prefix / "Metal049A_1K-JPG_NormalGL.jpg", "CC0 OpenGL Normal", True)
    for texture in (color, roughness, metalness, normal):
        links.new(mapping.outputs["Vector"], texture.inputs["Vector"])

    tint = nodes.new("ShaderNodeMixRGB")
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 0.72
    tint.inputs[2].default_value = (0.52, 0.58, 0.61, 1.0)
    links.new(color.outputs["Color"], tint.inputs[1])
    links.new(tint.outputs["Color"], principled.inputs["Base Color"])

    rough_ramp = nodes.new("ShaderNodeValToRGB")
    rough_ramp.color_ramp.elements[0].position = 0.18
    rough_ramp.color_ramp.elements[0].color = (0.34, 0.34, 0.34, 1.0)
    rough_ramp.color_ramp.elements[1].position = 0.86
    rough_ramp.color_ramp.elements[1].color = (0.63, 0.63, 0.63, 1.0)
    links.new(roughness.outputs["Color"], rough_ramp.inputs["Fac"])
    links.new(rough_ramp.outputs["Color"], principled.inputs["Roughness"])

    metal_ramp = nodes.new("ShaderNodeValToRGB")
    metal_ramp.color_ramp.elements[0].color = (0.72, 0.72, 0.72, 1.0)
    metal_ramp.color_ramp.elements[1].color = (0.94, 0.94, 0.94, 1.0)
    links.new(metalness.outputs["Color"], metal_ramp.inputs["Fac"])
    links.new(metal_ramp.outputs["Color"], principled.inputs["Metallic"])

    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = 0.22
    links.new(normal.outputs["Color"], normal_map.inputs["Color"])

    micro_noise = nodes.new("ShaderNodeTexNoise")
    micro_noise.noise_dimensions = "3D"
    micro_noise.inputs["Scale"].default_value = 85.0
    micro_noise.inputs["Detail"].default_value = 2.2
    micro_noise.inputs["Roughness"].default_value = 0.64
    links.new(mapping.outputs["Vector"], micro_noise.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.075
    bump.inputs["Distance"].default_value = 0.025
    links.new(micro_noise.outputs["Fac"], bump.inputs["Height"])
    links.new(normal_map.outputs["Normal"], bump.inputs["Normal"])
    links.new(bump.outputs["Normal"], principled.inputs["Normal"])

    links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    return material


def make_hardware_material() -> bpy.types.Material:
    material = bpy.data.materials.new("Dark Zinc Hardware")
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (0.12, 0.15, 0.17, 1.0)
    principled.inputs["Metallic"].default_value = 0.92
    principled.inputs["Roughness"].default_value = 0.38
    return material


def build_geometry(
    galvanized: bpy.types.Material,
    hardware: bpy.types.Material,
) -> None:
    gauge = 0.10
    large_depth = MOUTH_Y - REDUCER_FRONT_Y
    large_center_y = (MOUTH_Y + REDUCER_FRONT_Y) / 2
    add_box("Large Left Sheet", (gauge, large_depth, BIG_HEIGHT), (-BIG_WIDTH / 2, large_center_y, 0), galvanized)
    add_box("Large Right Sheet", (gauge, large_depth, BIG_HEIGHT), (BIG_WIDTH / 2, large_center_y, 0), galvanized)
    add_box("Large Ceiling Sheet", (BIG_WIDTH, large_depth, gauge), (0, large_center_y, BIG_HEIGHT / 2), galvanized)
    add_box("Large Floor Sheet", (BIG_WIDTH, large_depth, gauge), (0, large_center_y, -BIG_HEIGHT / 2), galvanized)

    big_left = -BIG_WIDTH / 2
    big_right = BIG_WIDTH / 2
    big_bottom = -BIG_HEIGHT / 2
    big_top = BIG_HEIGHT / 2
    small_left = SMALL_X - SMALL_WIDTH / 2
    small_right = SMALL_X + SMALL_WIDTH / 2
    small_bottom = SMALL_Z - SMALL_HEIGHT / 2
    small_top = SMALL_Z + SMALL_HEIGHT / 2
    create_panel(
        "Reducer Ceiling",
        [(big_left, REDUCER_FRONT_Y, big_top), (big_right, REDUCER_FRONT_Y, big_top), (small_right, REDUCER_BACK_Y, small_top), (small_left, REDUCER_BACK_Y, small_top)],
        galvanized,
    )
    create_panel(
        "Reducer Floor",
        [(big_right, REDUCER_FRONT_Y, big_bottom), (big_left, REDUCER_FRONT_Y, big_bottom), (small_left, REDUCER_BACK_Y, small_bottom), (small_right, REDUCER_BACK_Y, small_bottom)],
        galvanized,
    )
    create_panel(
        "Reducer Left Sheet",
        [(big_left, REDUCER_FRONT_Y, big_bottom), (big_left, REDUCER_FRONT_Y, big_top), (small_left, REDUCER_BACK_Y, small_top), (small_left, REDUCER_BACK_Y, small_bottom)],
        galvanized,
    )
    create_panel(
        "Reducer Right Sheet",
        [(big_right, REDUCER_FRONT_Y, big_top), (big_right, REDUCER_FRONT_Y, big_bottom), (small_right, REDUCER_BACK_Y, small_bottom), (small_right, REDUCER_BACK_Y, small_top)],
        galvanized,
    )

    small_depth = REDUCER_BACK_Y - DUCT_END_Y
    small_center_y = (REDUCER_BACK_Y + DUCT_END_Y) / 2
    add_box("Small Left Sheet", (gauge, small_depth, SMALL_HEIGHT), (small_left, small_center_y, SMALL_Z), galvanized)
    add_box("Small Right Sheet", (gauge, small_depth, SMALL_HEIGHT), (small_right, small_center_y, SMALL_Z), galvanized)
    add_box("Small Ceiling Sheet", (SMALL_WIDTH, small_depth, gauge), (SMALL_X, small_center_y, small_top), galvanized)
    add_box("Small Floor Sheet", (SMALL_WIDTH, small_depth, gauge), (SMALL_X, small_center_y, small_bottom), galvanized)

    create_rectangular_ring("TDC Entrance Flange", BIG_WIDTH, BIG_HEIGHT, 0.34, 0.32, MOUTH_Y + 0.03, 0, 0, galvanized, 0.075)
    create_rectangular_ring("Large Reinforcement One", BIG_WIDTH, BIG_HEIGHT, 0.16, 0.15, 0.55, 0, 0, galvanized, 0.045)
    create_rectangular_ring("Reducer Inlet Joint", BIG_WIDTH, BIG_HEIGHT, 0.21, 0.20, REDUCER_FRONT_Y + 0.02, 0, 0, galvanized, 0.05)
    create_rectangular_ring("Reducer Outlet Joint", SMALL_WIDTH, SMALL_HEIGHT, 0.20, 0.18, REDUCER_BACK_Y - 0.01, SMALL_X, SMALL_Z, galvanized, 0.045)
    create_rectangular_ring("Small Reinforcement", SMALL_WIDTH, SMALL_HEIGHT, 0.14, 0.13, -13.2, SMALL_X, SMALL_Z, galvanized, 0.035)

    ceiling_profile = [(-0.18, big_top - 0.015), (-0.10, big_top - 0.18), (0.10, big_top - 0.18), (0.18, big_top - 0.015)]
    create_prism_from_profile("Folded Ceiling Seam", ceiling_profile, MOUTH_Y - 0.25, REDUCER_FRONT_Y + 0.25, galvanized, 0.025)

    add_box("Left Standing Seam", (0.08, large_depth - 0.5, 0.22), (big_left + 0.035, large_center_y, 1.65), galvanized, 0.025)
    add_box("Right Standing Seam", (0.08, large_depth - 0.5, 0.22), (big_right - 0.035, large_center_y, -2.0), galvanized, 0.025)

    fastener_points = [
        (-3.45, 4.95),
        (3.45, 4.95),
        (-3.45, -4.95),
        (3.45, -4.95),
        (0.0, 5.62),
        (0.0, -5.62),
        (-4.02, 0.0),
        (4.02, 0.0),
    ]
    for index, (x, z) in enumerate(fastener_points, start=1):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=6,
            radius=0.085,
            depth=0.075,
            location=(x, MOUTH_Y + 0.225, z),
            rotation=(math.pi / 2, 0, 0),
        )
        bolt = bpy.context.active_object
        bolt.name = f"Flange Bolt {index:02d}"
        finish_mesh(bolt, hardware, bevel=0.018, segments=2)

    add_box(
        "End Cap",
        (SMALL_WIDTH, gauge, SMALL_HEIGHT),
        (SMALL_X, DUCT_END_Y, SMALL_Z),
        galvanized,
        bevel=0.035,
    )


def aim_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def configure_world(hdri_path: Path) -> None:
    world = bpy.data.worlds.new("Controlled Studio World")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputWorld")
    mix = nodes.new("ShaderNodeMixShader")
    light_path = nodes.new("ShaderNodeLightPath")
    dark = nodes.new("ShaderNodeBackground")
    dark.inputs["Color"].default_value = (0.008, 0.014, 0.021, 1.0)
    dark.inputs["Strength"].default_value = 0.16
    environment_background = nodes.new("ShaderNodeBackground")
    environment_background.inputs["Strength"].default_value = 0.36
    environment = nodes.new("ShaderNodeTexEnvironment")
    environment.image = bpy.data.images.load(str(hdri_path), check_existing=True)
    environment.image.colorspace_settings.name = "Linear Rec.709"
    environment.projection = "EQUIRECTANGULAR"
    texcoord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Rotation"].default_value[2] = math.radians(38)

    links.new(texcoord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], environment.inputs["Vector"])
    links.new(environment.outputs["Color"], environment_background.inputs["Color"])
    links.new(environment_background.outputs["Background"], mix.inputs[1])
    links.new(dark.outputs["Background"], mix.inputs[2])
    links.new(light_path.outputs["Is Camera Ray"], mix.inputs[0])
    links.new(mix.outputs["Shader"], output.inputs["Surface"])


def add_area_light(
    name: str,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    energy: float,
    size: float,
    color: tuple[float, float, float],
) -> None:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.active_object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    aim_at(light, target)


def configure_camera() -> None:
    bpy.ops.object.camera_add(location=(4.5, 23.5, -1.4))
    camera = bpy.context.active_object
    camera.name = "Campaign 003 Hero Camera"
    camera.data.lens = 43.0
    camera.data.sensor_width = 36.0
    camera.data.clip_start = 0.1
    camera.data.clip_end = 120.0
    aim_at(camera, (0.15, -5.0, 0.35))
    bpy.context.scene.camera = camera


def configure_render(args: argparse.Namespace) -> str:
    scene = bpy.context.scene
    scene.render.resolution_x = round(1080 * args.scale)
    scene.render.resolution_y = round(1920 * args.scale)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.filepath = str(args.output.resolve())
    scene.render.film_transparent = False
    scene.render.use_file_extension = True
    scene.render.engine = "CYCLES" if args.engine == "cycles" else "BLENDER_EEVEE"

    device_summary = "CPU"
    if args.engine == "cycles":
        scene.cycles.samples = args.samples
        scene.cycles.use_denoising = True
        scene.cycles.use_adaptive_sampling = True
        scene.cycles.adaptive_threshold = 0.02
        scene.cycles.max_bounces = 6
        scene.cycles.diffuse_bounces = 3
        scene.cycles.glossy_bounces = 4
        try:
            preferences = bpy.context.preferences.addons["cycles"].preferences
            preferences.compute_device_type = "OPTIX"
            preferences.get_devices()
            enabled = []
            for device in preferences.devices:
                device.use = device.type == "OPTIX"
                if device.use:
                    enabled.append(f"{device.name} ({device.type})")
            if enabled:
                scene.cycles.device = "GPU"
                device_summary = ", ".join(enabled)
        except Exception as error:  # noqa: BLE001 - Blender must retain CPU fallback.
            print(f"GPU_CONFIGURATION_WARNING={error}")

    for look in ("AgX - Medium High Contrast", "AgX - Medium High Contrast"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = -0.35
    return device_summary


def main() -> None:
    args = parse_args()
    args.output = args.output.resolve()
    args.blend = args.blend.resolve()
    args.assets = args.assets.resolve()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.blend.parent.mkdir(parents=True, exist_ok=True)

    clear_scene()
    galvanized = make_galvanized_material(args.assets)
    hardware = make_hardware_material()
    build_geometry(galvanized, hardware)
    configure_world(args.assets / "studio_small_08_1k.hdr")
    add_area_light("Soft Key", (-5.0, 6.5, 7.5), (0.0, -4.0, 0.8), 950.0, 5.5, (0.88, 0.95, 1.0))
    add_area_light("Cool Edge", (6.5, 1.5, 3.0), (0.8, -6.0, 0.2), 700.0, 4.0, (0.48, 0.70, 0.9))
    add_area_light("Interior Fill", (-2.5, -1.5, -2.2), (0.4, -11.0, 0.4), 420.0, 3.0, (0.78, 0.87, 0.92))
    configure_camera()
    device = configure_render(args)

    bpy.ops.wm.save_as_mainfile(filepath=str(args.blend))
    render_started = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    render_seconds = time.perf_counter() - render_started

    print(f"BLENDER_VERSION={bpy.app.version_string}")
    print(f"BACKGROUND_MODE={bpy.app.background}")
    print(f"RENDER_ENGINE={bpy.context.scene.render.engine}")
    print(f"RENDER_DEVICE={device}")
    print(f"RESOLUTION={bpy.context.scene.render.resolution_x}x{bpy.context.scene.render.resolution_y}")
    print(f"SAMPLES={args.samples if args.engine == 'cycles' else 'EEVEE_DEFAULT'}")
    print(f"RENDER_SECONDS={render_seconds:.3f}")
    print(f"OUTPUT={args.output}")
    print(f"BLEND_FILE={args.blend}")


if __name__ == "__main__":
    main()
