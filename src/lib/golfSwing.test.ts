import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sampleGolfSwing,
  dot,
  CLUB_RADIUS,
  SWING_START_MS,
  SWING_TOP_MS,
  SWING_CONTACT_MS,
  SWING_FINISH_MS,
  type GolfPoint,
} from './golfSwing';

const distance = (a: GolfPoint, b: GolfPoint) => Math.hypot(...a.map((v, i) => v - b[i]));

test('the club keeps its length and perpendicular face through the entire swing', () => {
  let previous = sampleGolfSwing(0);
  for (let ms = 1; ms <= SWING_FINISH_MS; ms += 1) {
    const current = sampleGolfSwing(ms);
    assert.ok(Math.abs(distance(current.grip, current.tip) - CLUB_RADIUS) < 1e-8);
    assert.ok(Math.abs(dot(current.direction, current.face)) < 1e-8);
    assert.ok(distance(previous.tip, current.tip) < 4, `club teleported at ${ms}ms`);
    assert.ok(distance(previous.grip, current.grip) < 2, `hands teleported at ${ms}ms`);
    previous = current;
  }
});

test('a 2:1 backswing and delivery return a square clubface to the address point', () => {
  assert.equal(SWING_TOP_MS - SWING_START_MS, 2 * (SWING_CONTACT_MS - SWING_TOP_MS));
  const address = sampleGolfSwing(0);
  const top = sampleGolfSwing(SWING_TOP_MS);
  const delivery = sampleGolfSwing(750);
  const contact = sampleGolfSwing(SWING_CONTACT_MS);
  assert.ok(top.grip[1] < 210, 'hands must rise above the shoulders');
  assert.ok(top.grip[2] > 20, 'backswing must travel behind the body');
  assert.ok(delivery.hinge > 80, 'early delivery retains the wrist hinge');
  assert.equal(contact.hinge, 0);
  assert.ok(distance(address.tip, contact.tip) < 1e-8);
  assert.ok(distance(contact.face, [0, 0, -1]) < 1e-8);
});

test('forward extension comes toward the camera before the club wraps behind the head', () => {
  const extension = sampleGolfSwing(990);
  const finish = sampleGolfSwing(SWING_FINISH_MS);
  assert.ok(extension.grip[2] < -30);
  assert.ok(finish.grip[2] < 0, 'finishing hands stay in front');
  assert.ok(finish.tip[2] > 0, 'the finishing shaft wraps behind the head');
  assert.ok(finish.grip[0] < 235 && finish.grip[1] < 200, 'mirrored hands finish upper-right');
});
