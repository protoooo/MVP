# ProtoIcon Design Specification

## Visual Description

The ProtoIcon is a custom-designed animated icon that represents Proto as an adaptive, all-encompassing AI agent. It combines planetary imagery with orbital mechanics to symbolize Proto's comprehensive understanding and continuous learning.

## Icon Elements

```
     ╭─────────────────╮
     │    ⭐ sparkle    │  ← Appears/disappears (top-right)
     │                  │
     │   ╱────────╲    │  ← Outer orbit ring (rotates, pulses)
     │  ╱    ●     ╲   │
     │ │    ███     │  │  ← Core planet (pulses)
     │  ╲   ███    ╱   │
     │   ╲────────╱    │  ← Orbital ring (rotates like Saturn's rings)
     │                  │
     │  ⭐ sparkle      │  ← Appears/disappears (bottom-left)
     ╰─────────────────╯
```

## Animation Layers

### 1. **Outer Orbit Ring** (outermost)
- Ellipse with 2px stroke
- Draws in and out (pathLength animation)
- Simultaneously rotates 360°
- Creates orbital motion effect
- **Timing:** 3s draw cycle, 8s rotation cycle

### 2. **Core Planet** (center)
- Solid circle, r=6
- Breathing effect (scale 0.8 → 1 → 0.8)
- Opacity pulses (0.8 → 1 → 0.8)
- Represents Proto's "brain" or core intelligence
- **Timing:** 2s pulse cycle

### 3. **Orbital Ring** (middle)
- Elliptical ring at 15° angle
- Continuous rotation like Saturn's rings
- Semi-transparent (opacity: 0.6)
- Adds depth and movement
- **Timing:** 6s rotation cycle

### 4. **Primary Sparkle** (top-right)
- Small circle (r=1.5)
- Appears and disappears
- Represents insights/ideas
- **Timing:** 2s cycle, 0.5s delay

### 5. **Secondary Sparkle** (bottom-left)
- Smaller circle (r=1)
- Appears and disappears
- Slightly dimmer than primary
- **Timing:** 2s cycle, 1s delay

## Color Behavior

The icon uses `currentColor`, meaning it inherits the text color from its parent:

```tsx
// White icon on indigo background
<div className="text-white bg-indigo-600">
  <ProtoIcon />
</div>

// Indigo icon on white background
<div className="text-indigo-600 bg-white">
  <ProtoIcon />
</div>
```

## Size Variants

```tsx
// Small (thinking indicator)
<ProtoIcon className="w-5 h-5" animated={true} />

// Medium (dashboard header)
<ProtoIcon className="w-7 h-7" animated={true} />

// Large (onboarding avatar)
<ProtoIcon className="w-10 h-10" animated={true} />
```

## Animation States

### Static Mode
```tsx
<ProtoIcon animated={false} />
```
- Shows complete icon without animation
- All elements visible
- No motion
- Use for: Logos, static branding

### Animated Mode (Default)
```tsx
<ProtoIcon animated={true} />
```
- Full animation suite
- Synchronized motion
- Continuous loop
- Use for: Thinking indicators, loading states, interactive elements

## Design Inspiration

### GitHub Copilot
- ✅ Clean, recognizable silhouette
- ✅ Professional appearance
- ✅ Smooth, mesmerizing animation

### Supabase
- ✅ Chunky, bold strokes
- ✅ Modern SaaS aesthetic
- ✅ Green/teal vibes (we use indigo)

### Planetary Theme
- ✅ Represents comprehensive knowledge (all-encompassing)
- ✅ Orbital mechanics = continuous learning
- ✅ Core + rings = layered intelligence

## Technical Details

**Format:** SVG
**ViewBox:** 0 0 24 24
**Stroke Width:** 1.5-2px (chunky style)
**Animation Library:** Framer Motion
**File Size:** ~4KB
**Performance:** Hardware-accelerated (transforms only)

## Usage Examples

### In ThinkingIndicator
```tsx
<div className="text-indigo-600">
  <ProtoIcon className="w-5 h-5" animated={true} />
</div>
```

### In ProtoIntroduction
```tsx
<div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
  <ProtoIcon className="w-10 h-10" animated={true} />
</div>
```

### In Dashboard Header
```tsx
<div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
  <ProtoIcon className="w-7 h-7" animated={true} />
</div>
```

## Accessibility

- **ARIA:** Icon is decorative, no aria-label needed
- **Motion:** Respects `prefers-reduced-motion` (can be enhanced)
- **Contrast:** Always used with sufficient color contrast
- **Sizing:** Scales cleanly from 16px to 128px+

## Future Enhancements

Potential additions:
- [ ] Respect `prefers-reduced-motion` media query
- [ ] Add hover state (faster rotation)
- [ ] Add "success" state (green glow)
- [ ] Add "error" state (red pulse)
- [ ] Export as standalone .svg for marketing

## Brand Consistency

The ProtoIcon should be used consistently across:
- ✅ Thinking indicators
- ✅ Loading states
- ✅ Avatar/profile images
- ✅ Onboarding screens
- ✅ Browser favicon (future)
- ✅ Social media (future)
- ✅ Documentation headers

---

**The ProtoIcon is Proto's visual identity** - a professional, animated representation of an adaptive AI that continuously learns and evolves with your business.
