class HttpError extends Error {
 constructor(status, message) { super(message); this.status = status; }
}
function id(value, name = 'ID') {
 if (!['number', 'string'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) ||
 !Number.isSafeInteger(Number(value)) || Number(value) > 4294967295)
 throw new HttpError(400, `${name} must be a positive integer.`);
 return Number(value);
}
function text(value, name, max, optional = false) {
 if (optional && (value === undefined || value === null)) return '';
 if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max)
 throw new HttpError(400, `${name} must be ${optional ? 'text' : 'nonempty text'} of at most ${max} characters.`);
 return value.trim();
}
function submission(body) {
 const quantity = id(body.quantity, 'Quantity');
 if (quantity > 2147483647) throw new HttpError(400, 'Quantity is too large.');
 return { courseId: id(body.courseId, 'Course ID'), quantity,
 title: text(body.title, 'Title', 255), author: text(body.author, 'Author', 255),
 publisher: text(body.publisher, 'Publisher', 255), isbn: text(body.isbn, 'ISBN', 20, true),
 edition: text(body.edition, 'Edition', 50, true), otherMaterials: text(body.otherMaterials, 'Other materials', 10000, true) };
}
module.exports = { HttpError, id, text, submission };
