import asyncio

from app.services.resume_parser import resume_parser_service


async def main():
    markdown = """
# John Doe
Email: john@example.com
Phone: 123-456-7890

## Summary
Experienced software engineer with 5 years in Python and React.

## Skills
- Python (5 years, Expert)
- React (3 years, Intermediate)

## Education
- B.S. Computer Science, University of Example, 2015-2019, GPA: 3.8

## Work Experience
- Software Engineer, Tech Corp, 2019-Present
  - Developed a scalable backend system.
  - Technologies: Python, Docker
"""
    result = await resume_parser_service.structure_resume(markdown)
    import json

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
