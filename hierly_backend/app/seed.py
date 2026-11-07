from .models import db, User, AptitudeQuestion, CodingProblem

FEATURES = [("Resume Analysis", "Upload your resume and get an ATS-style score with tips."),
            ("Aptitude Tests", "Quantitative, logical and verbal practice with explanations."),
            ("Coding Practice", "Solve problems in a built-in editor and run test cases."),
            ("AI Mock Interviews", "Practise role-based questions and get AI feedback.")]
ROLES = ["Software Developer", "Data Analyst", "Web Developer", "QA Engineer"]
INTERVIEW = {
    "HR": ["Tell me about yourself.", "Why do you want this role?", "Describe a challenge you overcame.",
           "Where do you see yourself in 5 years?", "What are your strengths and weaknesses?"],
    "Technical": ["Explain OOP concepts with an example.", "What is the difference between a list and a tuple?",
                  "How does a hash map work?", "Explain REST APIs.", "What is the difference between SQL and NoSQL?"]}
APT = [("Quantitative", "A train 120 m long passes a pole in 6 s. Its speed?", ["15 m/s", "20 m/s", "24 m/s", "30 m/s"], 1, "Speed = 120 / 6 = 20 m/s."),
       ("Quantitative", "What is 15% of 240?", ["24", "30", "36", "40"], 2, "0.15 x 240 = 36."),
       ("Logical", "Series: 2, 6, 12, 20, ?", ["28", "30", "32", "36"], 1, "Differences are 4, 6, 8, 10, so the next is 30."),
       ("Logical", "All cats are animals. Some animals are pets. Which MUST be true?", ["All cats are pets", "Some cats are pets", "Cats are animals", "No cat is a pet"], 2, "Only 'cats are animals' is stated directly."),
       ("Verbal", "Synonym of 'Abundant'", ["Scarce", "Plentiful", "Rare", "Tiny"], 1, "Abundant means plentiful."),
       ("Verbal", "She ___ to college daily.", ["go", "going", "goes", "gone"], 2, "A singular subject takes 'goes'.")]
CODE = [("Two Sum", "Easy", "Line 1: numbers separated by spaces. Line 2: target. Print the two indices (space separated) whose numbers add up to the target.", "Input: 2 7 11 15 / 9  ->  Output: 0 1", [["2 7 11 15\n9", "0 1"], ["3 2 4\n6", "1 2"]]),
        ("Valid Parentheses", "Medium", "Read one line of brackets. Print true if balanced, otherwise false.", "Input: ()[]{}  ->  Output: true", [["()[]{}", "true"], ["(]", "false"]]),
        ("Longest Unique Substring", "Hard", "Read one string. Print the length of the longest substring with no repeated characters.", "Input: abcabcbb  ->  Output: 3", [["abcabcbb", "3"], ["bbbbb", "1"]])]


def seed():
    """Fill an empty database with demo users and starter questions."""
    if not User.query.first():
        for name, email, pw, adm in [("Demo Student", "demo@hierly.com", "demo123", False), ("Admin", "admin@hierly.com", "admin123", True)]:
            u = User(name=name, email=email, is_admin=adm); u.set_pw(pw); db.session.add(u)
    if not AptitudeQuestion.query.first():
        db.session.add_all(AptitudeQuestion(cat=c, q=q, options=o, answer=a, expl=e) for c, q, o, a, e in APT)
    if not CodingProblem.query.first():
        db.session.add_all(CodingProblem(title=t, diff=d, desc=s, ex=x, tests=ts) for t, d, s, x, ts in CODE)
    db.session.commit()
