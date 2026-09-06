"""Run with Blender -b -Y --python scripts/export-bighero.py -- SOURCE_DIR OUTPUT.glb."""
import bpy
import math
import os
import sys
from mathutils import Matrix

source, output = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=os.path.join(source, 'Armored Baymax.blend'))
rig = bpy.data.objects['Baymax_Armor_Armature']
meshes = [o for o in rig.children_recursive if o.type == 'MESH']
for collection in bpy.data.collections:
    collection.hide_viewport = False
for obj in [rig, *meshes]:
    obj.hide_viewport = False
    obj.hide_select = False
    obj.hide_set(False)

# Convert the four supplied legacy texture slots into glTF-compatible materials.
textures = {
    'RED_Hand': 'Baymax_Hand_Texture.png',
    'RED_Shoulder': 'Baymax_Shoulder_Texture.png',
    'purple_Back': 'Baymax_Back_Armor_Texture.jpg',
    'purple_front': 'Baymax_Stomach_Armor_Texture.jpg',
}
for material in {m for o in meshes for m in o.data.materials if m}:
    color = material.diffuse_color[:]
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Roughness'].default_value = .4
    if material.name in ('Metal', 'Silver'):
        shader.inputs['Metallic'].default_value = .65
    if material.name == 'TRANSPARENT':
        shader.inputs['Alpha'].default_value = .12
    if material.name in textures:
        image = bpy.data.images.load(os.path.join(source, 'TEXTURE', textures[material.name]), check_existing=True)
        image.filepath = os.path.join(source, 'TEXTURE', textures[material.name])
        image.reload()
        node = material.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = image
        material.node_tree.links.new(node.outputs['Color'], shader.inputs['Base Color'])

# The original has a posing rig but no animation clips. Bake a simple game walk.
for bone in rig.pose.bones:
    for constraint in list(bone.constraints):
        bone.constraints.remove(constraint)
    bone.matrix_basis = Matrix.Identity(4)
    bone.rotation_mode = 'XYZ'
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for side in ('L', 'R'):
    for end, parent in [('Hand', 'L_Arm'), ('Foot', 'L_Leg')]:
        rig.data.edit_bones[f'Armor_{end}.{side}'].parent = rig.data.edit_bones[f'Armor_{parent}.{side}']
bpy.ops.object.mode_set(mode='OBJECT')

# Apply surface modifiers while retaining the armature and skin weights.
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    # Facial shape keys are unused by the walking clips; keep the base face.
    if obj.data.shape_keys:
        obj.shape_key_clear()
    for modifier in list(obj.modifiers):
        if modifier.type == 'ARMATURE':
            continue
        if modifier.type == 'CLOTH':
            obj.modifiers.remove(modifier)
            continue
        if modifier.type == 'SUBSURF':
            modifier.levels = 1
            modifier.render_levels = 1
        bpy.ops.object.modifier_apply(modifier=modifier.name)

rig.animation_data_create()
bpy.context.scene.render.fps = 24
for name in ('Idle', 'Walk'):
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    for frame in range(1, 26):
        phase = (frame - 1) / 24 * math.tau
        for side, sign in [('L', 1), ('R', -1)]:
            swing = math.sin(phase) * sign if name == 'Walk' else 0
            rotations = {
                'U_Arm': (-1.05, swing * .2, 0),
                'L_Arm': (-.12, 0, 0),
                'Shoulder': (-.35, swing * .08, 0),
                'U_Leg': (swing * .38, 0, 0),
                'L_Leg': (max(0, -swing) * .5, 0, 0),
                'Foot': (-max(0, -swing) * .2, 0, 0),
            }
            for joint, rotation in rotations.items():
                bone = rig.pose.bones[f'Armor_{joint}.{side}']
                bone.rotation_euler = rotation
                bone.keyframe_insert('rotation_euler', frame=frame)
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    track.mute = True
rig.animation_data.action = bpy.data.actions['Idle']
bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for obj in [rig, *meshes]:
    obj.select_set(True)
os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=output, export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='ACTIONS',
    export_anim_slide_to_zero=True, export_current_frame=True,
    export_yup=True, export_cameras=False, export_lights=False,
    export_skins=True, export_def_bones=False,
)
print('EXPORTED', output, os.path.getsize(output))
