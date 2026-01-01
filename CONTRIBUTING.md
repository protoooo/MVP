# Contributing to Business Workspace

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. Follow the instructions in [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. Create a new branch for your feature: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Code Style

### TypeScript
- Use TypeScript for all new code
- Enable strict mode
- Add type annotations for function parameters and return types
- Use interfaces over type aliases when possible

### React/Next.js
- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use server components by default, add `"use client"` only when needed

### Naming Conventions
- **Components**: PascalCase (e.g., `TaskOutputDisplay.tsx`)
- **Utilities**: camelCase (e.g., `text-extraction.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `TIME_SAVED_ESTIMATES`)
- **React hooks**: camelCase starting with `use` (e.g., `useDocuments`)

### File Organization
```
components/     - Reusable UI components
lib/           - Utility functions and shared logic
app/           - Next.js app router pages and API routes
app/api/       - API route handlers
```

## Component Guidelines

### Use Existing Components
Before creating a new component, check if one already exists:
- `Toast` - For notifications
- `Skeleton` - For loading states
- `EmptyState` - For empty data states
- `OutputActionBar` - For output actions
- `TrialBanner` - For trial status
- `DocumentInsightsBanner` - For document suggestions

### Component Structure
```tsx
"use client"; // Only if needed

import { useState } from "react";
import { showToast } from "@/components/Toast";

interface ComponentProps {
  // Props with JSDoc comments
  /** The title to display */
  title: string;
  /** Optional callback */
  onAction?: () => void;
}

export default function Component({ title, onAction }: ComponentProps) {
  const [state, setState] = useState(false);
  
  // Component logic
  
  return (
    <div className="p-4">
      {/* Component UI */}
    </div>
  );
}
```

## Styling Guidelines

### TailwindCSS
- Use Tailwind utility classes
- Follow the spacing system (4px grid)
- Use the design tokens from `tailwind.config.ts`
- No arbitrary values unless absolutely necessary

### Spacing
- Sections: `py-8` (32px)
- Cards: `p-6` (24px)
- Lists: `space-y-4` (16px)
- Buttons: `px-4 py-2` (16px / 8px)

### Colors
Use the theme colors defined in tailwind.config.ts:
- Primary actions: `bg-blue-600`
- Success: `bg-green-600`
- Warning: `bg-yellow-600`
- Error: `bg-red-600`
- Agent-specific: `bg-honey-600`, `bg-sage-600`, etc.

## API Routes

### Structure
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Your logic here
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Error Handling
- Always return user-friendly error messages
- Log detailed errors server-side only
- Use appropriate HTTP status codes
- Never expose sensitive data in errors

## Testing

### Manual Testing Checklist
Before submitting a PR, test:
- [ ] Feature works as expected
- [ ] No console errors
- [ ] Works on mobile (375px width)
- [ ] Keyboard navigation works
- [ ] Loading states display correctly
- [ ] Error states handled gracefully

### Browser Testing
Test on:
- Chrome (latest)
- Safari (macOS & iOS)
- Firefox (latest)

## Commit Messages

Use conventional commits format:
```
type(scope): description

[optional body]
[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(uploads): add document processing status indicator
fix(chat): resolve agent context loading issue
docs(readme): update setup instructions
```

## Pull Request Process

1. **Create a branch** from `main`
2. **Make your changes** following the code style
3. **Test thoroughly** (see checklist above)
4. **Update documentation** if needed
5. **Submit PR** with:
   - Clear title and description
   - Screenshots for UI changes
   - List of changes made
   - Any breaking changes noted

### PR Review Checklist
- [ ] Code follows style guidelines
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No security vulnerabilities introduced

## Adding New Features

### Document Processing
When adding document types:
1. Add extraction logic to `lib/text-extraction.ts`
2. Update mime type handling
3. Add tests for the new type
4. Update user documentation

### New Agent
To add a new agent:
1. Create agent page in `app/dashboard/[agent-name]/page.tsx`
2. Add agent route in `app/api/[agent-name]/route.ts`
3. Add agent tools in `lib/agent-tools.ts`
4. Update navigation in `app/dashboard/layout.tsx`
5. Add agent icon and color scheme

### New Component
1. Create component in `components/`
2. Add TypeScript types
3. Document props with JSDoc
4. Export as default
5. Add to component library documentation

## Performance Guidelines

- Use React.memo() for expensive components
- Lazy load heavy components with dynamic imports
- Optimize images (use Next.js Image component)
- Minimize bundle size (check with `npm run build`)
- Use server components when possible

## Security Guidelines

- Never commit secrets or API keys
- Validate all user inputs
- Sanitize data before database insertion
- Use parameterized queries
- Enable HTTPS in production
- Implement rate limiting for API routes
- Use secure headers (see next.config.js)

## Documentation

Update documentation when:
- Adding new features
- Changing API contracts
- Modifying environment variables
- Changing database schema

Files to update:
- `README.md` - Main project documentation
- `SETUP_GUIDE.md` - Setup instructions
- `.env.example` - Environment variables
- JSDoc comments in code

## Questions?

- Check existing issues and discussions
- Review documentation
- Ask in discussions for general questions
- Create an issue for bugs or feature requests

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
