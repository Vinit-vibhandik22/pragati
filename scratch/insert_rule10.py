rule10_lines = [
    '     10. Jirayat/Bagayat Land Type Check (BAKSY Rules):',
    '        - The 7/12 extract shows land type as "Jirayat" (Dryland / rain-fed) or "Bagayat" (Irrigated).',
    '        - Rules based on subsidy type:',
    '          * "New Well" (Navin Vihir): Land MUST be Jirayat. Bagayat means irrigation already exists -- REJECT.',
    '          * "Farm Pond" (Plastic Lining): Land MUST be Jirayat. Rainwater collection for dryland -- REJECT if Bagayat.',
    '          * "Old Well Repair", "In-well Boring", "Pump Set", "Electricity Connection": Land MUST be Bagayat -- REJECT if Jirayat.',
    '          * "Drip Irrigation", "Sprinkler Irrigation": Either type acceptable, but a water source must be present.',
    '          * "Tractor", "Implements": Either land type acceptable. No restriction.',
    '        - If land type does not match requirements, set landTypeCheck to "FAIL" and flag as "LAND_TYPE_MISMATCH".',
]

with open('app/api/phase3-audit/route.ts', 'rb') as f:
    content = f.read()

# The actual bytes in file
old = b'WATER_SOURCE_MISMATCH".\r\n\r\n    Extract'
rule10_block = ('\r\n'.join(rule10_lines)).encode('utf-8')
new = b'WATER_SOURCE_MISMATCH".\r\n' + rule10_block + b'\r\n\r\n    Extract'

content2 = content.replace(old, new, 1)

with open('app/api/phase3-audit/route.ts', 'wb') as f:
    f.write(content2)

print('done' if content2 != content else 'no change - pattern not found')
