"""Minimal Blender installation and headless-render verification."""

from pathlib import Path
import sys

import bpy


def main() -> None:
    output = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    bpy.ops.mesh.primitive_cube_add(location=(0.0, 0.0, 0.0))
    cube = bpy.context.active_object
    cube.name = "HeadlessVerificationCube"

    bpy.ops.object.camera_add(location=(4.0, -4.0, 3.0))
    camera = bpy.context.active_object
    camera.rotation_euler = (1.109, 0.0, 0.785)
    bpy.context.scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(2.0, -2.0, 4.0))
    light = bpy.context.active_object
    light.data.energy = 800.0
    light.data.shape = "DISK"
    light.data.size = 4.0

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 64
    scene.render.resolution_y = 64
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(output)
    scene.render.film_transparent = False
    scene.world.color = (0.015, 0.02, 0.03)

    print(f"BLENDER_VERSION={bpy.app.version_string}")
    print(f"BACKGROUND_MODE={bpy.app.background}")
    print(f"PYTHON_VERSION={sys.version.split()[0]}")
    print(f"RENDER_ENGINE={scene.render.engine}")
    bpy.ops.render.render(write_still=True)
    print(f"VERIFY_OUTPUT={output}")


if __name__ == "__main__":
    main()
