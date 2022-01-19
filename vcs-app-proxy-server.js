const express = require("express");
const app = express();
const helmet = require("helmet");
const port = process.env.port || 3001;
require("isomorphic-fetch");
app.use(helmet());

// Route to get user information (username,repositories,profile picture,bio etc) from Github,BitBucket,Gitlab based on the user name that is searched
app.get("/get-user/:name", async (req, res) => {
  // Create empty array to store user info and create variable to store username
  let userArray = [];
  let userName = req.params.name;

  // Retrieve user github information by using fetch to the Github API and store information in json
  const gitHubUserInfo = await fetch(
    "https://api.github.com/users/" + userName
  );
  let gitHubUserObject = await gitHubUserInfo.json();
  userArray.push(gitHubUserObject);

  // Retrieve user gitlab information by using fetch to the GitLab API to retrieve user ID and convert to json object
  const gitLabAccountID = await fetch(
    "https://gitlab.com/api/v4/users?username=" + userName
  );
  const gitLabAccountObject = await gitLabAccountID.json();

  // Check if the object is empty and push it to array to show that no user was found
  if (gitLabAccountObject.length === 0) {
    userArray.push(gitLabAccountObject);
  } else {
    // If user is found with ID, use ID to retrieve the rest of their information then store it in a json object and add it to the user array
    const gitLabUserInfo = await fetch(
      "https://gitlab.com/api/v4/users/" + gitLabAccountObject[0].id
    );
    const gitLabUserInfoObject = await gitLabUserInfo.json();
    userArray.push(gitLabUserInfoObject);
  }

  // Use bitbucket API to see if a user exists by retrieving their repositories
  const bitBucketUserInfo = await fetch(
    "https://api.bitbucket.org/2.0/repositories/" + userName
  );
  const bitBucketUserObject = await bitBucketUserInfo.json();
  // Check if there are any repositories with the user name we are searching for
  if (bitBucketUserObject.type === "error") {
    userArray.push({ type: "Error", description: "User does not exist" });
  } else {
    // Check the amount of repositories available to determine the privacy of the user
    if (bitBucketUserObject.values.length === 0) {
      userArray.push({
        type: "Error",
        description: "User profile is on private mode",
      });
    } else {
      // If the user profile is public and exists, use the unique identfier with the api to access to full details of the account
      const bitBucketPublicUserInfo = await fetch(
        "https://api.bitbucket.org/2.0/users/" +
          bitBucketUserObject.values[0].owner.uuid
      );
      const bitBucketPublicUserInfoObject =
        await bitBucketPublicUserInfo.json();
      userArray.push(bitBucketPublicUserInfoObject);
    }
  }

  res.send(userArray);
});

// Route to retrieve gitHub repositories information  
app.get("/user/github/repo/:name", async (req, res) => {
  // Create variables to store info retrieved from API request
  let repositoryArray = [];

  let userName = req.params.name;

  // Retrieve 5 most recently created repositories, convert it to a JSON Object
  const recentRepositories = await fetch(
    "http://api.github.com/users/" +
      userName +
      "/repos?per_page=" +
      5 +
      "&sort=create"
  );
  let repositoryObject = await recentRepositories.json();

  // Loop through repository object to retrieve information of each repository using github api and store it in an array that is easy to access for react
  for (let i = 0; i < repositoryObject.length; i++) {
    let repositoryCommits = await fetch(
      "https://api.github.com/repos/" +
        userName +
        "/" +
        repositoryObject[i].name +
        "/commits?per_page=5"
    );
    let repoCommitsObject = repositoryCommits.json();

    // Create an object and store all repository information within the object
    let repoInfoObj = new Object();
    repoInfoObj.repoName = repositoryObject[i].name;
    repoInfoObj.repoDesc = repositoryObject[i].description;
    repoInfoObj.createdDate = repositoryObject[i].created_at.substr(0, 10);
    repoInfoObj.commitMsg = [];

    //  Loop through fetch results to retrieve all commit messages and push into array
    for (let x = 0; x < repoCommitsObject; x++) {
      repoInfoObj.commitMsg.push(repoCommitsObject[x].commit.message);
    }
    repositoryArray.push(repoInfoObj);
  }
  res.send(repositoryArray);
});

// Route to retrieve Bit Bucket repositories
app.get("/user/bitbucket/repo/:name", async (req, res) => {
  let repositoryArray = [];
  let userName = req.params.name;

  // Retrieve 5 most recent repositories
  const recentRepositories = await fetch(
    "https://api.bitbucket.org/2.0/repositories/" +
      userName +
      "?pagelen=" +
      5 +
      "&sort=-created_on"
  );
  let repositoryObject = await recentRepositories.json();
  // Loop through repository object to retrieve information of each repository using github api and store it in an array that is easy to access for react
  for (let i = 0; i < repositoryObject.values.length; i++) {
    let repositoryCommits = await fetch(
      repositoryObject.values[i].links.commits.href + "?pagelen=" + 5
    );
    let commits = await repositoryCommits.json();
    // Create an object and store all repository info within the object
    let repoInfoObj = new Object();
    repoInfoObj.repoName = repositoryObject.values[i].name;
    repoInfoObj.createdDate = repositoryObject.values[i].created_on.substr(
      0,
      10
    );
    repoInfoObj.commitMsg = [];
    //  Loop through fetch results to retrieve all commit messages and push into array
    for (let x = 0; x < commits.values[x].length; x++) {
      repoInfoObj.commitMsg.push(commits.values[x].rendered.message.raw);
    }
    repositoryArray.push(repoInfoObj);
  }
  res.send(repositoryArray);
});
// Route to retrieve gitlab repositories
app.get("/user/gitlab/repo/:name", async (req, res) => {
  let repositoryArray = [];
  let userName = req.params.name;
  // Retrieve 5 most recent repositories
  const recentRepositories = await fetch(
    "https://gitlab.com/api/v4/users/" + userName + "/projects?per_page=" + 5
  );
  let repositoryObject = await recentRepositories.json();
  // Loop through repository object to retrieve information of each repository using github api and store it in an array that is easy to access for react
  for (let i = 0; i < repositoryObject.length; i++) {
    let repositoryCommits = await fetch(
      "https://gitlab.com/api/v4/projects/" +
        repositoryObject[i].id +
        "/repository/commits?per_page=5"
    );
    let commits = await repositoryCommits.json();

    // Create an object and store all repository info within the object
    let repoInfoObj = new Object();
    repoInfoObj.repoName = repositoryObject[i].name;
    repoInfoObj.createdDate = repositoryObject[i].description;
    repoInfoObj.createdDate = repositoryObject[i].created_at.substr(0, 10);
    repoInfoObj.commitMsg = [];

    //  Loop through fetch results to retrieve all commit messages and push into array
    for (let x = 0; x < commits.length; x++) {
      repoInfoObj.commitMsg.push(commits[x].title);
    }
    repositoryArray.push(repoInfoObj);
  }
  res.send(repositoryArray);
});

app.listen(port, () => {
  console.log(`API server is listenin on port ${port}`);
});
