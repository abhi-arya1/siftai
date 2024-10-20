import Groq from "groq-sdk";

// Define types for the function parameters
type ReadTextFunction = (expression: string) => string;

type HighlightFunction = (fileContents: string, query: string) => Promise<string>;

type ToolCall = {
    function: {
        name: string;
        arguments: string; // JSON string
    };
    id: string;
};

type ChatMessage = {
    role: "system" | "user" | "assistant" | "function";
    content: string | null;
    name?: string;
    function_call?: {
        name: string;
        arguments: string;
    };
};

type ToolDefinition = {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                [key: string]: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
    };
};

// Initialize Groq client
const client = new Groq({ apiKey: "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" });
const MODEL = "llama3-groq-8b-8192-tool-use-preview";

// Highlight function to uppercase strings if they contain the query
const read_text_and_highlight: HighlightFunction = async (fileContents, query) => {
    const limit = 24576;
    // Prepare the Groq request 
    const messages = [
        {
            role: "user",
            content: `Based on the following text, uppercase literally ANYTHING that pertains to the query within the text and return back. Text: "${fileContents}" Query: "${query}"`
        }
    ];

    // Send request to Groq to get inferred highlights
    const response = await client.chat.completions.create({
        model: MODEL,
        messages: messages,
        stream: false,
        max_tokens: 4096 // Adjust as needed
    });

    console.log(response.choices[0].message.content);
    const inference = response.choices[0].message.content;

    // Use the inferred information to highlight
    const regex = new RegExp(inference, 'gi'); // Assuming inference contains the text to highlight
    const highlightedText = fileContents.replace(regex, (matched) => matched.toUpperCase());
    
    return highlightedText;
};

async function runConversation(userPrompt: string, query: string): Promise<string> {
    const messages: ChatMessage[] = [
        {
            role: "system",
            content: "You are an assistant. Use the highlight function to highlight text that is important to the query by uppercasing it and return only what's given to."
        },
        {
            role: "user",
            content: userPrompt,
        }
    ];

    const tools: ToolDefinition[] = [
        {
            type: "function",
            function: {
                name: "read_text_and_highlight",
                description: "Read text and highlight the given text that is important to the query by uppercasing it.",
                parameters: {
                    type: "object",
                    properties: {
                        fileContents: {
                            type: "string",
                            description: "The text to read and highlight from",
                        },
                        query: {
                            type: "string",
                            description: "The query to search for in the text.",
                        }
                    },
                    required: ["fileContents", "query"],
                },
            },
        }
    ];

    try {
        const response = await client.chat.completions.create({
            model: MODEL,
            messages: messages,
            stream: false,
            tools: tools,
            tool_choice: "auto",
            max_tokens: 4096
        });

        const msg = response.choices[0].message;
        const toolCalls = msg.tool_calls || [];

        if (toolCalls.length > 0) {
            const availableFunctions: { [key: string]: Function } = {
                "read_text_and_highlight": read_text_and_highlight
            };

            // Process only the first tool call
            const toolCall = toolCalls[0];
            const functionName = toolCall.function.name;
            const functionToCall = availableFunctions[functionName];
            const functionArgs = JSON.parse(toolCall.function.arguments); // Parse arguments

            // Call the function and get the highlighted response
            const finalResponse = await functionToCall(functionArgs.fileContents, query);

            return finalResponse.trim(); // Return the final response directly
        }

        return msg.content || "";
    } catch (error) {
        console.error("Error during API call:", error);
        return "An error occurred.";
    }
}

// Run the conversation with the prompt and query
const a = `ICS 33 Fall 2024 | News | Course Reference | Schedule | Project Guide | Notes and Examples | Reinforcement Exercises | Grade Calculator | About Alex"

ICS 33 Fall 2024
Notes and Examples: Databases

Background

As far back as your first course in Python, you likely learned about data structures, which provide us with the ability to organize objects in a way that enables us to solve problems with them. You've probably also seen a few of Python's built-in data structures — lists, tuples, sets, and dictionaries, at a minimum — and have since sharpened your sense of when you might need to use one as opposed to the others. Different data structures organize objects differently, enabling some interactions to be natural and performant, while forcing others to be difficult or slow (or both), so we choose primarily on the basis of what interactions we'll need to do, ensuring that the necessary interactions work well, even if the unnecessary ones would be more problematic. (It doesn't matter how problematic an operation will be if it's one we'll never need to do, after all.) Our recent discussion of asymptotic analysis adds a more quantitative methodology for making these kinds of decisions, which doesn't change our goals, but nonetheless gives us new ways to demonstrate whether we're reaching them.

Still, there are few consequential programs whose goals are entirely met by a single data structure. In all but the smallest and simplest programs, we'll find that we usually need to organize different subsets of objects in different ways, so we might find ourselves with, say, many lists, several tuples, a few sets, and numerous dictionaries, each chosen because that particular subset of our data will need to be used in certain ways but not others. So, in that way, a data structure is a small-picture concept; each is a tool, but we usually need many different tools to write realistically sized programs.

Thinking at a higher level, we say that a database is an entire collection of data that we'd like one or more programs to manage over time, so that those programs can find the information they need and change it as required. Not all of that data will necessarily have the same type, not all of it will necessarily be organized in the same way, and not all of it will necessarily be stored in the same way (e.g., some might be stored on disk, some might be in memory); as we do when we choose data structures in Python, we make organizational decisions on the basis of how we'll need to interact with our data. Most often, a database is managed outside of the programs we write; a database management system, or DBMS, is a software system that specializes in solving these kinds of problems, so that we don't have to solve them from first principles. (This is fortunate, because the collection of problems to be solved is substantially similar in most programs that need to manage large amounts of data, and many of those problems require intricate solutions that even experts have a difficult time implementing precisely.)

Database systems are a central topic of other courses you may take later in a computing curriculum, but we're well equipped to take the first steps of that journey now, even if we'll need to defer many of the details until later courses. As with many topics in computing, we can get a lot of work done with meager skills, as long as we recognize where our skills are limiting us — so, in practice, we'll know when we need to refine our understanding, or when it's best to defer to (and learn from) team members whose expertise exceeds ours.

Relational databases

Databases have been built in a number of styles over the years. There's no one style that's definitively better than the others — as usual, different problems are best solved with differently shaped tools — but, by far, the most common one (and, arguably, the most broadly useful one) is called a relational database, so we'll focus our attention on that style.

A relational database is one in which we store data elements that can be explicitly related to one another. A relational database describing the current state of operations at UCI, for example, might store information about students, courses, instructors, and classrooms, along with information about how they're related to each other — which students are enrolled in which courses, which instructors are teaching which courses, which courses are scheduled in which classrooms and at which times, and so on. By making those relationships an explicit part of our database, we give ourselves the ability to answer questions centered on an understanding of those relationships, such as "How many students were enrolled in courses taught by Alex Thornton during the 2018-19 academic year?" or "How many students took a course last quarter and are enrolled in the same course again this quarter?"

When we use a DBMS to manage a relational database, we gain the ability to ask questions such as these without choosing data structures, deciding on the algorithms to be used when obtaining data from them and combining it into an overall answer, or needing to implement and test those algorithms. It's not magic, though. When we make ill-considered choices about the organization of our data, the DBMS will make similarly poor choices of algorithms on our behalf. So, in practice, we still need to know something about how our DBMS organizes data, along with at least a basic understanding of the factors that impact its performance, especially when our databases grow large enough that poorly chosen algorithms will result in unacceptable performance.

Tables, rows, and columns

Relational databases are organized primarily around information stored in tables. A table is a two-dimensional structure, made up of rows and columns. Each table is dedicated to storing one kind of data element — a student, a course, a classroom — with each row in that table representing one data element and each column within that row specifying one thing we want to know about it. For example, we might have the following table describing courses at UCI — which would have many more than the three rows and three columns depicted below, but we'll just show three of each to keep the example simple.

course
course_number	course_name	unit_count
Row #1	ICS 31	Introduction to Programming	4
Row #2	ICS 32	Programming with Software Libraries	4
Row #3	ICS 33	Intermediate Programming with Python	4
Each row specifies information about a course, but notably absent is information specifying who will be teaching the courses, which students are enrolled in them, in which quarters they'll be offered, and so on. That's not an oversight; it's because all of these things describe relationships between courses and data elements in other tables, an issue we'll return to later.

Each column in a row is made up of a value that has a known type. In Python terms, we might think of the columns named course_number and course_name as containing strings, while the column named unit_count contains integers. We'll ordinarily specify these types when designing our relational database, and, unlike in Python, the DBMS will usually enforce them vigilantly (e.g., we won't be able to store a string like 'Boo' in the unit_count column).

Your background in Python offers a reasonably good mental model for how a table might be arranged if it was stored in memory by a Python program: as a list containing tuples, where the list is not sorted in a particular order, and where every tuple has the same number of values in the same relative order. A list turns out to be a good approximation, because it offers the core understanding that we can find a row in a table most quickly if we know where it's stored, just as we can find an element in a Python list most quickly if we know its index. Each data element being a tuple is a good approximation, too, because each row is made up of values in multiple columns, but we know their structure ahead of time — course_number is always first, followed by course_name, and then unit_count — so we can quickly obtain exactly the values we want by knowing that structure, just like we can when we use tuples in Python.

There are a couple of additional small issues with a surprisingly big impact if we ignore them, so it's best for us to nail them down now.

We generally want every row in a table to be distinguished from the others in some way. Even if there are two rows with the same value in one column, there should never be two rows with the same values in all columns, so we can be sure that there's always a way to distinguish two rows from each other.
We generally want each column to be made up of a value you might call a scalar, which is to say that there's no advantage if we break it into smaller values, since they wouldn't be individually or separately meaningful. Reasonable people can disagree on where to draw the line, but that's the general goal to bear in mind.
Neither of these properties will necessarily be enforced automatically, but we'll nonetheless want to keep them in mind when we decide how to organize our information into tables, a topic we'll consider in a little more depth shortly.

Primary keys

Because of our desire to be sure that every row in a table is distinguishable from the others in some way, it's usually a good idea to be sure that every table has a subset of its columns that form a primary key, where the combination of values in those columns will always be different in any two rows — not just as a mechanism of enforcement, but as a matter of their underlying meaning, which is to say that there will never be two rows that legitimately have the same combination of values in primary key columns. If two rows will never have the same primary key, then we can be sure that no two rows will ever be identical, which means that primary keys elegantly solve the design problem of ensuring that rows are always distinguishable.

It's important to note that this means that our choice of primary key columns is not solely a computer science problem. Our choice is influenced heavily by the real-world meaning of our underlying data. For example, we wouldn't be able to use a person's name as a primary key, but the reason isn't fundamentally that we couldn't write a program that behaves that way; it's that we shouldn't, because two people can have the same name. We wouldn't be able to use an address or a phone number, either, for similar reasons. If there's no natural choice of primary key, we'll usually invent one, by assigning an additional identifier — a multi-digit integer is a common choice, because comparing and sorting integers is relatively inexpensive, though it doesn't have to be an integer. (Have you ever wondered why so many businesses and government entities assign you a "customer ID", a "taxpayer ID", or what-have-you? This is why; there's otherwise no single piece of information about you that's being stored and is guaranteed to distinguish you from someone else.)

Once we've identified which column (or columns) comprise the primary key for our table, we can specify them explicitly, which allows the DBMS to provide us with two benefits automatically.

It can automatically ensure that no two rows have the same primary key. To do that, it'll need a data structure that keeps track of which ones have been used already. (This sounds a lot like a problem that, in Python, could be solved using a set.)
Since it already has to track which primary keys have been used, it can associate with each primary key the location of the corresponding row, so that looking up a row given its primary key becomes substantially cheaper. (This means that the Python set we were considering before might best be replaced with a Python dictionary, with the dictionary's keys being our primary keys and the dictionary's values being locations within the list storing our table's rows. That way, we get the dual benefits of uniqueness enforcement and inexpensive lookups from the same data structure.)
For our table of courses depicted above, we might choose course_number as our primary key, since course numbers uniquely identify a course at UCI. The UCI General Catalogue, among other things, briefly describes each approved course offered on campus. Consequently, the ancillary data structure that maps primary keys to rows in our table of courses might look, conceptually, something like this.

Primary Key	Row Number
ICS 31	Row #1
ICS 32	Row #2
ICS 33	Row #3
Note, though, that this ancillary data structure would be organized something more like a Python dictionary, in the sense that we should be able to quickly find the row number associated with a primary key, without having to search through all of them. (If we had to search through them, then we might as well just search the original table.)

This kind of ancillary data structure used to locate the rows of a table by some combination of its columns is often called an index, and primary keys aren't the only columns we'll choose to index this way in practice. Proper use of indexes is an important part of making a large database performant, though there's a balance to be struck between having too many of them — which means spending additional storage for the indexes, and which makes updating any data in a table fraught, because of the need to update so many indexes alongside it — and having too few of them — which makes finding information problematic, because there's no shortcut available to find it without searching tables in their entirety. The name of the game is to use indexes to speed up the searches you know you'll need to do often, which means that the choice is one driven by practicality and an understanding of the real-world problem you're actually solving, more than it's about computer science or highbrow design thinking.

The same primary keys are stored in multiple places, because they appear not only in a table, but also in indexes associated with that table, as well as other tables (as we'll see when we talk more about the relationships between data elements). So, another important part of choosing a primary key is that we choose something that won't ever change. (This is another reason why software systems often assign otherwise-meaningless identifiers to entities. That way, if someone changes their name, moves to a new home, obtains a new phone number, or alters their lives or being in any other way, we can still identify them the same way as before. As people, even though it can feel like an indignity to be "treated like a number," it helps when we understand that there's a practical reason for at least some of that kind of treatment.)

Relationships

Primary keys have the dual purpose of providing a universal way to unambiguously describe a row in a table without duplicating it and enabling a mechanism for finding the rows they describe efficiently without haphazard searching. In effect, having the primary key of a row is a bit like having a reference to an object in Python, in the sense that knowing a primary key is enough to be able to quickly find the data element it describes, just as Python references allow us to access objects quickly and directly.

Given what we know about primary keys, it stands to reason that they also give us the foundation for implementing relationships, which indicate how data elements are related to one another in a relational database. If we want to relate data elements to each other, we can do so using their primary keys, just as we can relate objects to each other in Python using references to them. When we update those data elements, their relationships remain intact, just as mutating an object that happens to be stored in a Python list doesn't change its position in the list (because the list is storing only a reference to the object, rather than a copy of it).

Relationships are said to have a cardinality, which is a term borrowed from mathematics, but is simpler than it sounds. It's a way of describing the limits on how many elements can have a particular kind of relationship with each other. When considering a relationship between data elements in tables A and B, there are three cardinalities that we're primarily interested in.

A one-to-one relationship means that an element of A can only be related to one element in B, and that an element of B can only be related to one element in A. If we had a table specifying identifying information for students and another table containing students' UCInetIDs and their associated login credentials (password, etc.), each student would be associated with one UCInetID and one UCInetID could only be associated with one student.
A one-to-many relationship means that an element of A can be related to many different elements of B, but each element of B can only be related to one element of A. If we had a table specifying available time slots (i.e., a block of time on a particular day of the week during which a course can be scheduled to meet in one classroom), each time slot can only accommodate one course, but one course can occupy multiple time slots (e.g., by meeting on both Tuesdays and Thursdays).
A many-to-many relationship means that an element of A can be related to many different elements of B, and that each element of B can be related to many different elements of A. This is certainly the nature of the enrollment relationship between students and courses, since students can enroll in many different courses, and the same course can have many different students enrolled in it.
Of course, a many-to-many relationship is the most flexible, but the goal isn't to be maximally flexible. The goal is to be as flexible we need to be, but no more than that. In other words, we restrict ourselves to a one-to-one relationship when that limitation applies to the underlying data, such that anything more flexible than that would surely be wrong. Similarly, we permit many-to-many relationships only when we reasonably expect that the underlying data will require them.

(As an aside, this is one of the recurring themes you'll find as you learn more about programming, and one that we'll focus a lot of attention on during the latter half of this course. When you're first learning to program, the focus is on figuring out how to allow yourself to write the correct algorithm, so flexibility feels wonderful, since it means you have the freedom to write a wider variety of possible programs succinctly. As your experience grows, you realize that there are many more ways to do the wrong thing than to do the right one, so you build a desire to focus on preventing yourself from writing the incorrect algorithm, which means you need to find ways to limit your flexibility when circumstances warrant it. The appropriate amount of flexibility is determined by the problem you're actually solving, and the ideal is just enough flexibility, where any more would only provide avenues to introduce bugs, while any less would mean there are things you need to be able to do but can't.)

Foreign keys

We discussed previously that we can use a primary key to unambiguously describe a row in a table. So, if we want a row r1 to refer to a row r2, storing the primary key of r2 would be a good way to do it, whether r2 is in the same table as r1 or a different one. When we store one row's primary key in another row, we say that it acts as a foreign key, because it describes some row other than the one it appears in. Foreign keys form the basis of how we implement relationships.

The usual approach to implementing one-to-one relationships is to use a foreign key in one row to refer to the other. In our previous example of students and their login credentials, we might store them this way.

student
student_id	last_name	first_name
12345678	Thornton	Boo
23456789	Person	Some
  	
student_login
ucinetid	student_id
boo	12345678
sperson	23456789
The primary key of the student table is student_id.
The primary key of the student_login table is ucinetid.
The student_id column in the student_login table is a foreign key referring to the student_id column of the student table (i.e., uniquely identifying student rows by their primary key).
Rather than foreign key relationships being implicit, we usually specify them explicitly, so that the DBMS can enforce referential integrity, which simply means that it won't allow us to refer to rows that don't exist.

If we try to store a student_login row whose student_id doesn't match any student_id in the student table, it could then fail automatically.
If we tried to delete a row or update a student_id in the student table where a student_login row refers to it, the DBMS could disallow us from doing it, or could correspondingly update or delete the student_login row for us instead.
Since we wanted it to be the case that no student could have multiple logins, we could additionally specify that student_id be unique within the student_login table, which, if enforced automatically, would make it impossible for that to happen. Maintaining the integrity of our data in the long run is important enough that a relational DBMS will go to great lengths to forbid us from violating it. The more we can tell it about our data, and the more accurately we can specify the real-world constraints on it, the more safety nets it can erect underneath us automatically.

A one-to-many relationship could be implemented similarly, with the table on the "many" side of the relationship having a foreign key referring back to a row in the table on the "one" side, but without the restriction that the foreign key be unique in the "many" table. That's all there is to it.

Many-to-many relationships are a little more complicated, because we have no good way to specify an unlimited number of foreign keys in one row, since the structure of every row in a table — which columns exist, what their names are, and what they types are — needs to be the same, and since each column needs to store a scalar value. Generally, then, we implement a many-to-many relationship using a separate table that specifies the foreign keys of the related rows.

student
student_id	last_name	first_name
12345678	Thornton	Boo
23456789	Person	Some
  	
course
course_number	course_name
ICS 31	Introduction to Programming
ICS 32	Programming with Software Libraries
ICS 33	Intermediate Programming with Python
  	
enrollment
student_id	course_number
12345678	ICS 32
12345678	ICS 33
23456789	ICS 31
23456789	ICS 32
In this case, we see that Boo Thornton is enrolled in both ICS 32 and ICS 33, and that Some Person is enrolled in both ICS 31 and ICS 32. Note, too, that the enrollment table might have additional columns if there was additional information we needed to track specifically about each enrollment, such as the grade option (Letter Grade vs. Pass/Not Pass, for example).

SQL and SQLite

Now that we've explored some of the basic concepts underlying relational databases and the DBMSs that implement them on our behalf, it's time we put them into practice by interacting with one. It turns out that we have many to choose from, some of which are freely available and others that can be quite expensive. Broadly, we have two choices when we select a DBMS.

A completely separate software system that we could run alongside our own program, meaning either a separate program we run on the same computer as our program or a program we run elsewhere and communicate with via a network.
A relational database that we can embed within our own program, which is to say that it's a library whose functions we can call from our program, but that runs within our program the way that libraries such as tkinter or pygame do.
The tradeoff here boils down to one between ease of setup and the ability for many programs to connect to the same database simultaneously. If we need the latter, a separate database system would be a sensible choice. Otherwise, an embedded database will be the most straightforward choice. Given our goal of experimenting and learning on a relatively small scale using Python programs, we'll stick with an embedded DBMS, and we're fortunate that Python's standard library has one built into it, which is called SQLite, and which we can use via Python's sqlite3 module. (The 3 in its name refers to a version number; SQLite has been on variants of version 3 since 2004, with the current version, as of this writing, being 3.46.1.)

When using sqlite3 to manage a database, our first order of business is creating a connection, through which we can interact with our database. SQLite allows us to connect to a database in one of two ways:

As files stored on a device such as a hard disk or solid state drive, allowing the database to be persistent, which means that it outlives our program and will remain in the same state the next time our program starts.
Entirely in memory within our program, so that disconnecting from it also causes the database to be discarded, just like the objects in a Python program.
As a first experiment, we can connect to an in-memory database by calling sqlite3.connect and passing it the string ':memory:'. (If we had instead passed a filesystem path, we would be connecting to a database stored in a file at that path instead.)

>>> import sqlite3
>>> connection = sqlite3.connect(':memory:')
Once we've connected to a database, we can execute statements against it, which let us either modify the data within the database or obtain the data already in it. But SQLite's statements aren't written in Python, as it turns out, even though we'll be calling a Python method to execute them. SQLite takes part of its name from SQL (Structured Query Language), which is the name of the language that we'll use to write our statements, and which is the most commonly used language for interacting with relational databases.

Executing SQL statements using sqlite3

Initially, our database is empty, so if we want to store anything in it, we'll need to create at least one table, which we can do with a SQL statement called CREATE TABLE, an example of which is below.

CREATE TABLE person(
    person_id INTEGER PRIMARY KEY,
    name TEXT,
    age INTEGER
) STRICT;
There are a few things to take note of here.

Words written in uppercase are SQL keywords, which is to say that they're words that have special meaning in SQL, similar to words like def or class in Python. (There's no requirement that they be written in uppercase, but we'll stick to that convention for the sake of readability.)
Unlike in Python, whitespace (e.g., newlines and indention) does not have syntactic meaning in SQL, but we'll still aim to lay out our statements in a way that makes them readable for people.
We'll use a semicolon to end each of our statements, to make clear to SQLite that there is no more text in a statement. (This is not strictly necessary, but, like our use of readable spacing, is hygenic.)
We've given our table a name: person. (Though it's not an absolute requirement, when we give names to things, we'll use the same naming convention we use in Python, with words made up of lowercase letters, separated by underscores.)
We've specified that our table is made up of three columns, each of which has a name (like person_id or name) and a type (like INTEGER or TEXT). (We'll want every column to have a type explicitly specified for it.)
We've also specified that the person_id column is the table's primary key. (We'll always want to specify the primary key of every table we create.)
Finally, we've specified that our table is what SQLite calls STRICT, which instructs SQLite to require the types of values stored in each column to match the type specified for that column. (Strangely, this is not SQLite's default; when not specified as strict, a table allows any type of value to be stored anywhere. We'll always want our tables to be strict, because the only flexibility we'll have lost is the flexibility for our data not to match what we've said are the constraints that should limit it.)
Asking SQLite to execute our statement can be done by calling the execute method on our connection, passing it the statement as a Python string.

>>> connection.execute(
...     '''
...     CREATE TABLE person(
...         person_id INTEGER PRIMARY KEY,
...         name TEXT,
...         age INTEGER
...     ) STRICT;
...     ''')
...
    <sqlite3.Cursor object at 0x000001EC2EA93F40>
The execute method returns an object called a cursor, which allows us to access any data returned to us by SQLite. In this case, there's no data available — not all SQL statements return data to us — so there's nothing the cursor can do for us here.

In every database, SQLite maintains metadata, which describes the structure of the database, such as the names of each of the tables. The metadata is stored in the same kinds of tables that the rest of database is, which means we can interact with it the same way we interact with any other data. As a result, we can verify that our new person table exists by running a query, which is a kind of statement that allows us to access existing data already in the database. We write queries in SQL using a statement called SELECT. In its simplest form, SELECT returns every row of a table, though we can ask for only the columns whose values we need.

>>> cursor = connection.execute('SELECT name FROM sqlite_schema;')
                        # This query asks for the names of all tables that we've created.
                        # The sqlite_schema table is where metadata about the database's
                        # tables is stored.
>>> cursor.fetchone()
    ('person',)         # Each call to fetchone on a cursor returns one row of our
                        # result, expressed as a tuple whose values correspond to the
                        # columns we've asked for.  We've selected one column called
                        # name, so we're seeing one-element tuples returned to us.
>>> cursor.fetchone()
                        # fetchone returns None when there are no more rows.
>>> cursor.close()
                        # We can (and should) close cursors when we're done with them.
As you've seen from these first examples, we're experiencing some friction because there are two languages at work here: Python is what we're using to interact with the sqlite3 module, but we're sending SQL statements for execution and interpreting their results. For experimentation purposes, it would be nice if we could eliminate that friction, by having a program that allows us to type SQL statements and see their results directly. Without much more knowledge than we've already got, we can build one that's good enough to make our experimentation a whole lot easier, which will also teach us some of the basics of the sqlite3 library.

A SQLite shell written in Python

Below is a link to a SQLite shell that we'll use for experimentation going forward. It's worth spending some time reading through the code and its comments before proceeding.

sqlite_shell.py
Executing that program will give us a no-frills command interface that we can use to experiment with SQLite in the shell without having to repeatedly write the Python code required to send statements to SQLite and interpret their results. Here's an example of its execution.

    Database Path: ​:memory:​             # Leaving this blank also specifies an in-memory database.
                                        # You can also specify a filesystem path here.
    Statement: ​CREATE TABLE person(​
    .......... ​    person_id INTEGER PRIMARY KEY,​
    .......... ​    name TEXT,​
    .......... ​    age INTEGER​
    .......... ​) STRICT;​
    Statement: ​SELECT name​
    .......... ​FROM sqlite_schema;​
    ('person',)
    Statement: ​Hello Boo!;​
    ERROR: near "Hello": syntax error   # Invalid statements lead to error messages.
    Statement:                          # Enter a blank statement to end the program.
Storing data in a table

The SQL statement INSERT is what we use to add a new row to an existing table.

    Statement: ​CREATE TABLE person(​
    .......... ​    person_id INTEGER PRIMARY KEY,​
    .......... ​    name TEXT,​
    .......... ​    age INTEGER​
    .......... ​) STRICT;​
    Statement: ​INSERT INTO person (person_id, name, age)​
    .......... ​VALUES (1, 'Boo', 13);​
    Statement: ​INSERT INTO person (person_id, name, age)​
    .......... ​VALUES (1, 'Alex', 47);​
    ERROR: UNIQUE constraint failed: person.person_id
                           # SQLite is protecting us from a duplicate value in a primary key column.
                           # Remember that we can't use the same primary key for two rows in the
                           # same table.  The error message is telling us that explicitly:
                           # The person_id column in the person table is meant to be unique.
    Statement: ​INSERT INTO person (person_id, name, age)​
    .......... ​VALUES (2, 'Alex', 47);​
    Statement: ​SELECT name, age​
    .......... ​FROM person;​
    ('Boo', 13)            # Notice that the types of values in the tuples are reasonable
    ('Alex', 47)           # Python equivalents of the types we specified for the columns.
The syntax of an INSERT statement is a bit heavyweight, starting with the words INSERT INTO, followed by the name of a table, the names of the columns whose values we want to set, the word VALUES, and the values that correspond to the specified columns.

Filtering the results of a SELECT statement with a WHERE clause

So far, the SELECT statements we've written have asked for every row in a table, but it's more often the case that we want one particular row, or only the rows that have some characteristic we're interested in. Adding a WHERE clause to a SELECT statement is how we specify which rows we're interested in by writing a Boolean expression. For any row where the Boolean expression returns true, we'll get back that row; for others, we won't.

    Statement: ​SELECT name​
    .......... ​FROM person​
    .......... ​WHERE age < 40;​
    ('Boo',)
    Statement: ​SELECT name, age​
    .......... ​FROM person​
    .......... ​WHERE length(name) = 4 AND person_id BETWEEN 1 AND 10;​
    ('Alex', 47)
To be clear, SQLite has no Boolean type, so the actual mechanics of a WHERE clause are a bit like truthiness in Python, where, for example, zero is considered "false" and non-zero is considered "true". In general, though, it's best to avoid this, in favor of writing expressions that appear to be Boolean.

    Statement: ​SELECT name​
    .......... ​FROM person​
    .......... ​WHERE age;​
    ('Boo',)
    ('Alex',)              # Both Boo and Alex have non-zero age, but the query is a pretty
                           # obtuse way to ask that question.
Sorting the results of a SELECT statement with an ORDER BY clause

Ordinarily, we have no control over the order in which rows are returned to us from a SELECT statement, but we can sort those results by including an ORDER BY clause.

    Statement: ​SELECT name​
    .......... ​FROM person​
    .......... ​ORDER BY age ASC;​
    ('Boo',)               # ASC is short for "ascending", i.e., smallest to largest.
    ('Alex',)              # (Ascending is also the default if you don't say one way or the other.)
    Statement: ​SELECT name​
    .......... ​FROM person​
    .......... ​ORDER BY length(name) DESC;​
    ('Alex',)              # DESC is short for "descending", i.e., largest to smallest.
    ('Boo',)               # In this case, we're preferring longer names over shorter ones.
The order of the clauses in a SELECT statement is also important. If we have both a WHERE and an ORDER BY clause, the WHERE clause must be written first. (This syntax clue is useful, because it implies the order in which the clauses are executed. Since they can always be thought to execute in the same order, they have to be written in that order, to avoid confusion.)

    Statement: ​SELECT name​
    .......... ​FROM person​
    .......... ​ORDER BY age ASC​
    .......... ​WHERE age < 40;​
    ERROR: near "WHERE": syntax error
    Statement: ​SELECT name​
    .......... ​FROM person​
    .......... ​WHERE age < 40​
    .......... ​ORDER BY age ASC;​
    ('Boo',)               # Give me the name of everyone under 40 years old, ordered by
                           # age, preferring younger before older.
Modifying data in a table

An UPDATE statement modifies existing rows in a table. That modification requires us to specify two things: which rows to change and what change to make to them. Syntactically, these are handled via clauses called SET and WHERE.

    Statement: ​UPDATE person​
    .......... ​SET age = age + 1​
    .......... ​WHERE person_id = 2;​
    Statement: ​SELECT name, age​
    .......... ​FROM person​
    .......... ​WHERE person_id = 2;​
    ('Alex', 48)           # I'm another year older!  The story of our lives.
    Statement: ​INSERT INTO person (person_id, name, age)​
    .......... ​VALUES (3, 'Example', 99);​
    Statement: ​UPDATE person​
    .......... ​SET name = 'Someone',​
    .......... ​    age = 91​
    .......... ​WHERE person_id = 3;​
                           # We can update multiple columns of the same row.
    Statement: ​SELECT name, age​
    .......... ​FROM person​
    .......... ​WHERE person_id = 3;​
    ('Someone', 91)
    Statement: ​UPDATE person​
    .......... ​SET age = 0;​
                           # Without a WHERE clause, an UPDATE statement affects every row,
                           # just like a SELECT returns every row in that case.
    Statement: ​SELECT name, age​
    .......... ​FROM person;​
    ('Boo', 0)
    ('Alex', 0)
    ('Someone', 0)         Everyone's age is now zero!
Removing data from a table

A DELETE statement removes existing rows from a table, which means we'll want to be careful to specify which ones to remove. (Like SELECT and UPDATE, when we don't specify which row we want, we affect all of them, so you'll really want to be sure you include a WHERE clause.)

    Statement: ​DELETE​
    .......... ​FROM person​
    .......... ​WHERE person_id = 3;​
    Statement: ​SELECT name, age​
    .......... ​FROM person;​
    ('Boo', 0)
    ('Alex', 0)
We can also destroy a table altogether, using the DROP TABLE statement.

    Statement: ​DROP TABLE person;​
Describing missing data using NULL

Every row in a table consists of the same columns, which means that we know the same collection of information about each entity described within that table. This raises an interesting question: What do we do when we don't have all of that information? To address the issue of describing missing information, SQL has a special value named NULL.

When we INSERT a row into a table, but leave some of its columns unspecified, those columns are given a NULL value instead.

    Statement: ​CREATE TABLE course(​
    .......... ​    course_id INTEGER PRIMARY KEY,​
    .......... ​    course_number TEXT,​
    .......... ​    title TEXT,​
    .......... ​    unit_count INTEGER​
    .......... ​) STRICT;​
    Statement: ​INSERT INTO course (course_id, course_number)​
    .......... ​VALUES (1, 'ICS 31');​
                            # The new row will have NULL values in its title
                            # and unit_count columns.
    Statement: ​SELECT course_number, title, unit_count​
    .......... ​FROM course;​
    ('ICS 31', None, None)
             # ^^^^  ^^^^     NULLs are best expressed in Python using None, so
             #                that's what the sqlite3 library gives us.
    Statement: ​SELECT course_number, title, unit_count​
    .......... ​FROM course​
    .......... ​WHERE unit_count = NULL;​
                            # Why didn't we get back any rows here?
    Statement: ​SELECT course_number, title, unit_count​
    .......... ​FROM course​
    .......... ​WHERE unit_count IS NULL;​
    ('ICS 31', None, None)  # But we did get back a row here.
The last two SELECT statements point to an important aspect of the NULL value. Since NULL is equivalent to the idea of "We don't know this piece of information," then we can't know whether the comparison NULL = NULL is true or not. How can we know if two values are equivalent if we don't know what they are? So, in SQL, NULL = NULL doesn't return a Boolean "true" like you might expect. However, if we want to ask whether a value is missing (or present), we can use IS NULL (or IS NOT NULL) instead.

Enforcing data integrity

There's a flip side to this conversation, too. SQL allows us to express the idea that information is missing, but what do we do when information can't be missing? In other words, how do we prevent NULLs from appearing in places where we don't want them? Perhaps a person doesn't have a name, but they'll always need to have a person_id. Perhaps a course can be missing a title, but it needs a unit_count. How do we enforce these things? The answer lies in specifying additional constraints on our columns when we create our table.

    Statement: ​DROP TABLE course;​
    Statement: ​CREATE TABLE course(​
    .......... ​    course_id INTEGER NOT NULL PRIMARY KEY,​
    .......... ​    course_number TEXT NOT NULL,​
    .......... ​    title TEXT,​
    .......... ​    unit_count INTEGER NOT NULL​
    .......... ​) STRICT;​
                           # Adding NOT NULL to a column's type disallows it from
                           # storing a NULL value.
    Statement: ​INSERT INTO course (course_id)​
    .......... ​VALUES (1);​
    ERROR: NOT NULL constraint failed: course.course_number
                           # The constraint is automatically enforced.
    Statement: ​INSERT INTO course (course_id, course_number, unit_count)​
    .......... ​VALUES (1, 'ICS 31', 4);​
    Statement: ​SELECT title​
    .......... ​FROM course​
    .......... ​WHERE course_id = 1;​
    (None,)                # The title column is permitted to be NULL.
When defining the columns of a table, NOT NULL is not the only constraint we can write. A couple of other common examples of column constraints are these:

The CHECK constraint, which allows us to specify an expression that must be true of that column in every row of the table.
The UNIQUE constraint, which requires that every row have a unique value in that column.
    Statement: ​DROP TABLE course;​
    Statement: ​CREATE TABLE course(​
    .......... ​    course_id INTEGER NOT NULL PRIMARY KEY,​
    .......... ​    course_number TEXT NOT NULL UNIQUE,​
    .......... ​    title TEXT,​
    .......... ​    unit_count INTEGER NOT NULL CHECK (unit_count > 0)​
    .......... ​) STRICT;​
    Statement: ​INSERT INTO course (course_id, course_number, title, unit_count)​
    .......... ​VALUES (1, 'NonPos 1', 'Non-positive unit counts are disallowed', -1);​
    ERROR: CHECK constraint failed: unit_count > 0
                           # The CHECK constraint is evaluated on every row that's
                           # changed in some way.
    Statement: ​INSERT INTO course (course_id, course_number, title, unit_count)​
    .......... ​VALUES (1, 'ICS 31', NULL, 4);​
    Statement: ​INSERT INTO course (course_id, course_number, title, unit_count)​
    .......... ​VALUES (2, 'ICS 31', 'Another 31', 6);​
    ERROR: UNIQUE constraint failed: course.course_number
                           # The UNIQUE constraint disallows two rows with the same course_number.
Constraints involving combinations of columns can also be expressed on tables as a whole, rather than on individual columns, by listing them separately after the last column is defined.

    Statement: ​DROP TABLE course;​
    Statement: ​CREATE TABLE course(​
    .......... ​    course_id INTEGER NOT NULL PRIMARY KEY,​
    .......... ​    course_number TEXT NOT NULL,​
    .......... ​    title TEXT,​
    .......... ​    min_unit_count INTEGER NOT NULL,​
    .......... ​    max_unit_count INTEGER NOT NULL,​
    .......... ​    UNIQUE (course_number, title),​
    .......... ​    CHECK (max_unit_count >= min_unit_count)​
    .......... ​) STRICT;​
                           # Two rows can have the same course_number or title, but not the
                           # same combination of both.  No row can have max_unit_count be
                           # less than min_unit_count.
As we're seeing, one of the characteristics of SQL is its ability to allow us to specify the rules governing our data integrity, so that those rules can be enforced automatically. A DBMS can't know what data is correct in a real-world situation, but if we can describe what correct data looks like, then it can ensure that our data meets those constraints every step of the way. This places a slightly higher burden on us when we're defining our tables, but that's a small price to pay for the inability for our data to be incorrect. (Of course, that enforcement is only as good as the constraints we've specified, so it's necessary for us to make sure that the constraints match the underlying real-world requirements as closely as possible.)

Relationships and joins

We previously discussed the concept of a relationship between tables, and the use of foreign keys to establish those relationships. Let's put that into practice by building a many-to-many relationship between students and courses.

    Statement: ​CREATE TABLE student(​
    .......... ​    student_id INTEGER NOT NULL PRIMARY KEY,​
    .......... ​    name TEXT NOT NULL CHECK (length(name) > 0)​
    .......... ​) STRICT;​
    Statement: ​CREATE TABLE course(​
    .......... ​    course_id INTEGER NOT NULL PRIMARY KEY,​
    .......... ​    course_number TEXT NOT NULL CHECK (length(course_number) > 0),​
    .......... ​    unit_count INTEGER NOT NULL CHECK (unit_count > 0)​
    .......... ​) STRICT;​
    Statement: ​CREATE TABLE enrollment(​
    .......... ​    student_id INTEGER NOT NULL,​
    .......... ​    course_id INTEGER NOT NULL,​
    .......... ​    PRIMARY KEY (student_id, course_id),​
    .......... ​    FOREIGN KEY (student_id) REFERENCES student(student_id),​
    .......... ​    FOREIGN KEY (course_id) REFERENCES course(course_id)​
    .......... ​) STRICT;​
The PRIMARY KEY constraint on the enrollment table specifies both the student_id and course_id columns, because it's the combination of those values that uniquely identifies a row. (This means, among other things, that the same student can't be enrolled in the same course twice.) Meanwhile, the FOREIGN KEY constraints are how we specify that one or more columns in a table are meant to store primary keys belonging to other rows — which are usually rows in other tables. In this case, we want to ensure that enrollments are associated with students and courses that actually exist.

Once our tables exist and are related to each other, we can add some rows to them, subject to the constraints we've specified.

    Statement: ​INSERT INTO student (student_id, name)​
    .......... ​VALUES (1, 'Boo');​
    Statement: ​INSERT INTO student (student_id, name)​
    .......... ​VALUES (2, 'Alex');​
    Statement: ​INSERT INTO course (course_id, course_number, unit_count)​
    .......... ​VALUES (1, 'ICS 31', 4);​
    Statement: ​INSERT INTO course (course_id, course_number, unit_count)​
    .......... ​VALUES (2, 'ICS 32', 4);​
    Statement: ​INSERT INTO course (course_id, course_number, unit_count)​
    .......... ​VALUES (3, 'ICS 33', 4);​
    Statement: ​INSERT INTO enrollment (student_id, course_id)​
    .......... ​VALUES (1, 3);​
    Statement: ​INSERT INTO enrollment (student_id, course_id)​
    .......... ​VALUES (2, 1);​
    Statement: ​INSERT INTO enrollment (student_id, course_id)​
    .......... ​VALUES (2, 2);​
    Statement: ​INSERT INTO enrollment (student_id, course_id)​
    .......... ​VALUES (2, 2);​
    ERROR: UNIQUE constraint failed: enrollment.student_id, enrollment.course_id
                           # The same student can't be enrolled in the same course twice.
    Statement: ​INSERT INTO enrollment (student_id, course_id)​
    .......... ​VALUES (11, 17);​
    ERROR: FOREIGN KEY constraint failed
                           # Students and courses must exist before we can create an enrollment.
Once we have data in tables that are related to one another, we can write queries that use those relationships by doing what are called joins, which allows us to combine the rows of one table with rows of another. It's up to us to specify which rows are meant to be combined with which others, requiring us to specify a join condition, so that our result will only contain combinations that are useful to us.

While joins come in a few different forms, the most common is called an inner join, which means that we're looking only for a combination of rows from the tables that together meet the join condition. For example, if we wanted to know the names of the students who are enrolled in ICS 33, we could do so with the following query.

    Statement: ​SELECT s.name​
    .......... ​FROM student AS s​
    .......... ​     INNER JOIN enrollment AS e ON e.student_id = s.student_id​
    .......... ​     INNER JOIN course AS c ON c.course_id = e.course_id​
    .......... ​WHERE c.course_number = 'ICS 33';​
    ('Boo',)
What we're asking SQLite to find for us is a combination of rows in the student, enrollment, and course tables that meet two constraints.

The chosen student row has the same student_id as the chosen enrollment row.
The chosen course row has the same course_id as the chosen enrollment row.
(To simplify our query a bit, we've introduced temporary shorthand names for each table.)

There are three combinations of rows that match those constraints:

Boo is enrolled in ICS 33.
Alex is enrolled in ICS 31.
Alex is enrolled in ICS 32.
Why we only received one row, though, is that we used a WHERE clause to filter our result, which means that only the first of those rows matched. Had multiple students been enrolled in ICS 33, we would have seen them (and only them).

    Statement: ​INSERT INTO student (student_id, name)​
    .......... ​VALUES (3, 'Another');​
    Statement: ​INSERT INTO enrollment (student_id, course_id)​
    .......... ​VALUES (3, 3);​
                           # We've created another student, who's been enrolled in ICS 33.
    Statement: ​SELECT s.name​
    .......... ​FROM student AS s​
    .......... ​     INNER JOIN enrollment AS e ON e.student_id = s.student_id​
    .......... ​     INNER JOIN course AS c ON c.course_id = e.course_id​
    .......... ​WHERE c.course_number = 'ICS 33'​
    .......... ​ORDER BY s.name ASC;​
    ('Another',)
    ('Boo',)               # Now we see that both students are enrolled in ICS 33.
    Statement: ​SELECT c.course_number, s.name​
    .......... ​FROM student AS s​
    .......... ​     INNER JOIN enrollment AS e ON e.student_id = s.student_id​
    .......... ​     INNER JOIN course AS c ON c.course_id = e.course_id​
    .......... ​ORDER BY c.course_number ASC, s.name ASC;​
    ('ICS 31', 'Alex')
    ('ICS 32', 'Alex')
    ('ICS 33', 'Another')
    ('ICS 33', 'Boo')      # Every student enrollment, listed separately and sorted.
There's much more to be said about SQL, but this is enough complexity to get us off the ground. Still, if you're interested in learning more, your best bet is to look through SQLite's documentation as a starting point and let curiosity be your guide.

SQLite Documentation
There's one more thing we should consider before we leave this topic. We'll be writing Python programs that manipulate databases, by building SQL statements and sending them to SQLite via the sqlite3 library. In our experimentation here, we've been typing the SQL statements ourselves, but in a realistic program with a database underlying it, it would be our program writing the SQL statements, rather than our users. So, we should make sure we understand a couple of fundamental things about what happens when we write programs that themselves write programs (or, at least, fragments of programs) for us.

Avoiding injection attacks

Given our need to write a Python program that writes code on our behalf, we're in some interesting new territory. Whether it be a Python program that emits Python code and uses functions like eval or exec to execute it, or, in our case, a Python program that emits SQL code and sends it to SQLite to execute it instead, we face a similar set of problems, even if the details of the language syntaxes are different.

The rules of the language we're generating are what they are, and we have to respect those rules as carefully as we do when we're programming in the language ourselves. To the extent that things like punctuation, spacing, and escape characters within string literals are important, our generated code will have to get them right. Just like every character of a program we write can impact the result, every character of code we generate can, too.
When we write our own programs, we can follow an iterative process, in which we write code, test it, fix what's broken, test it again, and so on, until we have a program we're satisfied with. When we generate code automatically instead, the generated code needs to be right, or that's the end of the story — at least without modifying the program that generated the code.
If the code we generate utilizes user input to partly determine what gets generated, we run the risk that this user input mixes with our code generation in ways we might not have thought about. It's possible that our generated code won't run properly unless our user follows certain implicit rules (e.g., using a single quote in the last name O'Neill might cause a problem if we put it into a generated string literal surrounded by single quotes). A nefarious user might even be able to trick our code generator into writing code that does things we never intended at all, a point famously made by an online comic known as XKCD better than I ever could. These interactions are sometimes called injection attacks, wherein a user injects code into a system other than what the authors ever intended to be able to run, something that poorly designed code generation can easily lead to.
When it comes to generating SQL, our best bet is not to generate all of the text ourselves, but instead to generate fully-formed SQL statements that contain placeholders that can be filled in with any values being supplied dynamically (e.g., from user input). We can then allow SQLite to apply its understanding of the types involved — knowing, for example, that one column is an integer and another is text — to do the right thing without us having to worry about syntactic issues like the placement of single quotes and the handling of special characters.

The sqlite3 library offers two ways to parameterize a statement. The first approach is to use a positional approach, with question marks used to specify placeholders, and an additional tuple argument that supplies values for it. For example, we might write this in Python to add a new row to a person table.

connection.execute(
    'INSERT INTO person (name, age) VALUES (?, ?);',
    ('Boo', 13))
Behind the scenes, SQLite would know that name has the type TEXT and age has the type INTEGER, and would then be able to verify that our tuple reasonably fills in those placeholders, with the string 'Boo' matched to the first placeholder (for name) and the integer 13 matched to the second (for age). Notably, if the tuple was filled in with user-supplied data, the generated statement would always be the same; the only difference would be in the values of the tuple. Since the shape of the statement we're sending to SQLite is not determined by user input, we're protected from an injection attack.

A second approach is a named approach, with placeholders being given names, and an additional dictionary argument used to supply their values instead.

connection.execute(
    'INSERT INTO person (name, age) VALUES (:name, :age);',
    {'name': 'Boo', 'age': 13})
The named approach is more or less the same as the positional one, with the main benefits being readability — particularly if the dictionaries are being generated by functions that we're writing separately, where the names given to their keys would make clearer the way that the functions' meanings are connected to each other.

Transactions

Most often, a database is stored outside of our running program, with one or more files on a filesystem being the most common place for a database to reside. This means that changes we make to our database when we issue statements such as INSERT, UPDATE, or DELETE will manifest themselves as changes to those files, with those changes being essentially permanent once we've made them. With that level of permanence attached to the changes we're making, there are two questions worth considering.

What happens if we want to make two or more changes, but if any of them fails, we want to be sure that nothing has changed. A well-understood example of this is transferring money from one bank account to another. If withdrawing the money from one account succeeds, but depositing the money into the other account fails, we'd like to be sure that the withdrawal doesn't take effect, or else someone will have lost money.
What happens if two separate programs are running on the same machine, and both attempt to make changes to the same database files? How do we ensure that these changes are properly isolated from one another?
Relational databases solve problems like these using what are called transactions. A transaction is a sequence of changes that either takes effect in its entirety or not at all. While the transaction is in progress but hasn't finished yet, we'd prefer the partially applied changes not to be visible to anyone else. By instructing a DBMS when a new transaction should begin, then specifying explicitly when it's finished successfully, it can provide us these benefits automatically.

Like most relational DBMSs, SQLite provides the ability to execute transactions. In fact, they're the default when we use sqlite3 to connect to a SQLite database, which means that we need to specify that transactions have finished by committing them. (When we commit a transaction, we're saying that we've finished the transaction successfully, so we're asking for its changes to become visible in their entirety to everyone else.) If not, our transactions will be rolled back when our connection is closed, which means it'll be as though our changes never happened. (We can also explicitly roll back a transaction ourselves, when the need arises.)

# Boo will not be visible to anyone else yet, even if this call succeeds.
# If it fails, an exception will be raised, and we won't reach the call
# to commit() that comes next.
connection.execute(
    'INSERT INTO person (name, age) VALUES (:name, :age);',
    {'name': 'Boo', 'age': 13})

# Committing a transaction means that we want to make all of its changes
# visible to other connections subsequently.
connection.commit()
Handling simultaneous changes from multiple connections

When more than one transaction attempts to modify the same database simultaneously, this is potentially problematic. While fuller-featured DBMSs can allow a variety of modifications to happen simultaneously, SQLite is intended to be used at a somewhat smaller scale, so it takes a simpler approach that revolves around a simple rule: More than one transaction can read from the same database at the same time, but only one transaction can write to it.

So, if two transactions attempt to simultaneously write to the database, the first one to attempt to write will be allowed to do so, while the second will be placed "on hold" until the first has either committed or rolled back its transaction. If the second transaction remains blocked for longer than it's willing to wait — this is determined by something called a timeout, which defaults to five seconds in sqlite3 — it fails with an exception, which we can recognize using the following pattern.

try:
    connection.execute(
        'INSERT INTO person (name, age) VALUES (:name, :age);',
        {'name': 'Boo', 'age': 13})
except sqlite3.Error as e:
    if e.sqlite_errorcode == sqlite3.SQLITE_BUSY:
        print('Another transaction is blocking us')
    else:
        raise
By catching exceptions that arise from transactions being blocked due to the database being busy, we could, for example, employ logic to retry them, so that even a heavily used database might be able to eventually serve all of its transactions. Not every occurrence of a sqlite3.Error means the same thing, but SQLite passes its numeric error code back in the exception that it raises, so we can determine more details about what the underlying issue was. Meanwhile, by re-raising all of the other exceptions, we're making sure that other issues — those we aren't claiming to be able to handle — are still treated as unrecoverable failures, as they should be.`;
runConversation(
    `Read the following text: Everyone feels worried or anxious or down from time to time. But relatively few people develop a mental illness. What's the difference? A mental illness is a mental health condition that gets in the way of thinking, relating to others, and day-to-day function.

Dozens of mental illnesses have been identified and defined. They include depression, generalized anxiety disorder, bipolar disorder, obsessive-compulsive disorder, post-traumatic stress disorder, schizophrenia, and many more.

Mental illness is an equal opportunity issue. It affects young and old, male and female, and individuals of every race, ethnic background, education level, and income level. The good news is that it can often be treated.`,
    "mental illness"
)
    .then(result => console.log(result))
    .catch(error => console.error("Error:", error));
