class PromptBlock:
    def __init__(self, name, content, refname=None, **kwargs):
        self.name = name
        self.refname = refname
        self.content = content.strip()

    def render(self):
        return f"## {self.name}\n{self.content}"

class PromptVariable:
    def __init__(self, refname, name, content, **kwargs):
        self.refname = refname
        self.name = name
        self.content = content.strip()

    def render(self):
        return f"### {self.name}\n{self.content}"

class PromptCollection:
    def __init__(self, *blocks):
        self.blocks = list(blocks)
        self.sep = "\n\n"
        self.indexing = True

    def set_indexing_method(self, method_unused):
        # Kept for compatibility with prompt signatures
        self.indexing = True
        return self

    def set_sep(self, sep):
        self.sep = sep
        return self

    def format(self, inputs):
        rendered_parts = []
        for i, block in enumerate(self.blocks):
            if isinstance(block, PromptBlock):
                content = block.content
                # Inject variables dynamically if placeholders exist
                for k, v in inputs.items():
                    if f"{{{k}}}" in content:
                        # Format debt if list
                        if k == "debt" and isinstance(v, list):
                            formatted_debt = []
                            for idx, loan in enumerate(v):
                                formatted_debt.append(f"[Loan {idx}: ${loan.get('amount', 0):.2f}, Repayment Day: {loan.get('repayment_date', 0)}]")
                            v = ", ".join(formatted_debt) if formatted_debt else "No outstanding loans."
                        content = content.replace(f"{{{k}}}", str(v))
                
                if self.indexing:
                    header = f"## {i + 1}. {block.name}"
                else:
                    header = f"## {block.name}"
                rendered_parts.append(f"{header}\n{content}")

            elif isinstance(block, PromptVariable):
                content = block.content
                for k, v in inputs.items():
                    if f"{{{k}}}" in content:
                        content = content.replace(f"{{{k}}}", str(v))
                
                # Replace referenced placeholders
                rendered_parts.append(content)
        
        return self.sep.join(rendered_parts)

def sharp2_indexing(x):
    return x

def format_prompt(prompt, inputs):
    if isinstance(prompt, PromptCollection):
        return prompt.format(inputs)
    elif isinstance(prompt, PromptBlock):
        content = prompt.content
        for k, v in inputs.items():
            if f"{{{k}}}" in content:
                content = content.replace(f"{{{k}}}", str(v))
        return content
    elif isinstance(prompt, str):
        content = prompt
        for k, v in inputs.items():
            if f"{{{k}}}" in content:
                content = content.replace(f"{{{k}}}", str(v))
        return content
    return str(prompt)
