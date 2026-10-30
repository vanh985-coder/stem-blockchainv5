import sharp from 'sharp';

async function checkRef() {
  const p = 'assets/references/man5-whack-reference.png';
  const meta = await sharp(p).metadata();
  console.log(`Ref size: ${meta.width}x${meta.height}`);
  
  // Let's create a smaller preview of reference so we can view/inspect if needed
  await sharp(p)
    .resize(400)
    .toFile('docs/screenshots/p7c/ref-preview.png');
  console.log('Saved ref preview');
}
checkRef().catch(console.error);
